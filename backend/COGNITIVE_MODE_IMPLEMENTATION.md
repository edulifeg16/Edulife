# Cognitive-Friendly Content Generation System

## Overview
This system automatically generates simplified learning content for cognitive-impaired students when an admin uploads a video. It extracts transcripts, creates easy-to-understand summaries, bullet points, and simplified subtitles.

## Architecture

### Components Created

1. **simplificationService.js** - Core AI service for content simplification
2. **Course Model Updates** - Added `cognitiveMode` field to store simplified content
3. **Controller Enhancements** - Automatic workflow integration
4. **New API Endpoints** - Access content in Normal or Cognitive-Easy modes

---

## Workflow

### Automatic Processing (for Cognitive Disability Courses)

When an admin uploads a video for a course with `disabilityType: 'cognitive'`:

1. **Video Upload** → Video saved to `/uploads/videos/`
2. **Caption Generation** → AssemblyAI transcribes audio → VTT file created
3. **Transcript Extraction** → Parse VTT file to get plain text
4. **AI Simplification** (using Gemini AI):
   - Generate simplified summary (100-150 words, 5th-grade level)
   - Generate 5-7 key bullet points (short, simple sentences)
   - Generate simplified subtitles (5-8 words per line, easy vocabulary)
5. **Storage** → All content saved in `lesson.cognitiveMode` field

### Manual Processing (for Existing Lessons)

For lessons that already have captions but no cognitive content:
```
POST /api/courses/:courseId/lessons/:lessonId/generate-cognitive-content
```

---

## API Endpoints

### 1. Get Lesson Content by Mode
```http
GET /api/courses/:courseId/lessons/:lessonId/content?mode=cognitive-easy
GET /api/courses/:courseId/lessons/:lessonId/content?mode=normal
```

**Response Example (Cognitive-Easy Mode):**
```json
{
  "lessonId": "507f1f77bcf86cd799439011",
  "title": "Introduction to Photosynthesis",
  "videoUrl": "/uploads/videos/lesson1.mp4",
  "mode": "cognitive-easy",
  "content": {
    "summary": "Plants make their own food. They use sunlight, water, and air. This process is called photosynthesis. It happens in the leaves. Plants need sunlight to grow. They take in carbon dioxide. They give out oxygen. We breathe the oxygen that plants make.",
    "keyPoints": [
      "Plants make their own food",
      "They need sunlight and water",
      "This is called photosynthesis",
      "It happens in green leaves",
      "Plants give us oxygen to breathe"
    ],
    "subtitlesUrl": "/uploads/subtitles/caption_lesson1_simplified.vtt",
    "transcript": "Full transcript text..."
  }
}
```

**Response Example (Normal Mode):**
```json
{
  "lessonId": "507f1f77bcf86cd799439011",
  "title": "Introduction to Photosynthesis",
  "videoUrl": "/uploads/videos/lesson1.mp4",
  "mode": "normal",
  "content": {
    "textContent": "Full lesson text content",
    "subtitlesUrl": "/uploads/subtitles/caption_lesson1.vtt",
    "audioLessonUrl": "/uploads/audio/lesson1.mp3"
  }
}
```

### 2. Get Course with Both Modes
```http
GET /api/courses/:courseId/modes
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "subject": "Science",
  "standard": 8,
  "disabilityType": "cognitive",
  "lessons": [
    {
      "_id": "507f191e810c19729de860ea",
      "title": "Photosynthesis",
      "videoUrl": "/uploads/videos/lesson1.mp4",
      "normalMode": {
        "textContent": "Regular content...",
        "captionUrl": "/uploads/subtitles/caption_lesson1.vtt"
      },
      "cognitiveEasyMode": {
        "simplifiedSummary": "Plants make food...",
        "keyPoints": ["Plants make food", "They need sun"],
        "simplifiedSubtitlesUrl": "/uploads/subtitles/caption_lesson1_simplified.vtt",
        "processedAt": "2025-01-15T10:30:00.000Z"
      }
    }
  ]
}
```

### 3. Manually Generate Cognitive Content
```http
POST /api/courses/:courseId/lessons/:lessonId/generate-cognitive-content
```

**Use Case:** For existing lessons that have captions but no simplified content yet.

**Response:**
```json
{
  "msg": "Cognitive-friendly content generated successfully",
  "content": {
    "transcript": "Full transcript...",
    "simplifiedSummary": "Easy summary...",
    "keyPoints": ["Point 1", "Point 2", "..."],
    "simplifiedSubtitlesUrl": "/uploads/subtitles/caption_xyz_simplified.vtt",
    "processedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### 4. Generate Subtitles for Existing Lesson
```http
POST /api/courses/:courseId/lessons/:lessonId/generate-subtitles
```

**Body (optional):**
```json
{
  "language": "en"  // ISO 639-1 language code
}
```

---

## Database Schema

### Course Model - Lesson Schema
```javascript
{
  title: String,
  videoUrl: String,
  captionUrl: String,
  
  // NEW: Cognitive Easy Mode content
  cognitiveMode: {
    transcript: String,                    // Full extracted transcript
    simplifiedSummary: String,             // 100-150 word easy summary
    keyPoints: [String],                   // 5-7 simple bullet points
    simplifiedSubtitlesUrl: String,        // URL to simplified VTT file
    processedAt: Date                      // Generation timestamp
  }
}
```

---

## Simplification Service Functions

### 1. `extractTranscriptFromVTT(vttFilePath)`
Parses VTT subtitle file and extracts plain text transcript.

**Input:** Path to VTT file  
**Output:** Plain text string

### 2. `generateSimplifiedSummary(transcript)`
Uses Gemini AI to create easy-to-read summary.

**Features:**
- 5th-grade reading level
- Short sentences (10-12 words max)
- Simple vocabulary
- 100-150 words

### 3. `generateKeyBulletPoints(transcript)`
Generates 5-7 key takeaways in simple language.

**Features:**
- One sentence per point
- Maximum 10 words per point
- Action-oriented when possible

### 4. `generateSimplifiedSubtitles(transcript, originalVttPath)`
Creates simplified VTT subtitles with same timing as original.

**Features:**
- 5-8 words per subtitle line
- Simple vocabulary
- Present tense preferred
- Active voice

### 5. `processVideoForCognitiveMode(captionUrl)`
Main workflow function - orchestrates all simplification steps.

**Input:** Caption URL (e.g., `/uploads/subtitles/caption_xyz.vtt`)  
**Output:** Complete simplified content object

---

## Frontend Integration

### Example: Toggle Between Modes

```javascript
// Fetch lesson content
const fetchLessonContent = async (courseId, lessonId, mode = 'normal') => {
  const response = await fetch(
    `/api/courses/${courseId}/lessons/${lessonId}/content?mode=${mode}`
  );
  return await response.json();
};

// Usage in React component
const [mode, setMode] = useState('normal');
const [content, setContent] = useState(null);

useEffect(() => {
  fetchLessonContent(courseId, lessonId, mode)
    .then(data => setContent(data.content));
}, [mode]);

// Toggle button
<button onClick={() => setMode(mode === 'normal' ? 'cognitive-easy' : 'normal')}>
  {mode === 'normal' ? 'Switch to Easy Mode' : 'Switch to Normal Mode'}
</button>

// Display content
{mode === 'cognitive-easy' && content && (
  <div>
    <h3>Summary</h3>
    <p>{content.summary}</p>
    
    <h3>Key Points</h3>
    <ul>
      {content.keyPoints.map((point, i) => (
        <li key={i}>{point}</li>
      ))}
    </ul>
    
    <video controls>
      <source src={videoUrl} />
      <track src={content.subtitlesUrl} kind="captions" />
    </video>
  </div>
)}
```

---

## Configuration

### Environment Variables Required

```env
# Already configured in your .env file
GEMINI_API_KEY=your_gemini_api_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
```

### Dependencies (Already Installed)

```json
{
  "@google/generative-ai": "^0.24.1",
  "axios": "^1.13.1",
  "fluent-ffmpeg": "^2.1.3"
}
```

---

## Testing the Workflow

### Test 1: Upload New Cognitive Course

```bash
# Use your admin upload form or API
POST /api/courses
Content-Type: multipart/form-data

courseData: {
  "subject": "Science",
  "standard": 8,
  "disabilityType": "cognitive",
  "lessons": [
    {
      "title": "Test Lesson"
    }
  ]
}
lessonVideos: [video_file.mp4]
```

**Expected Result:**
- Video uploaded
- Captions generated automatically
- Simplified content generated automatically
- All data saved in database

### Test 2: Manually Generate for Existing Lesson

```bash
POST /api/courses/507f1f77bcf86cd799439011/lessons/507f191e810c19729de860ea/generate-cognitive-content
```

**Expected Result:**
- Reads existing captions
- Generates simplified content
- Updates lesson in database

### Test 3: Fetch Content by Mode

```bash
# Get cognitive-easy mode
GET /api/courses/507f1f77bcf86cd799439011/lessons/507f191e810c19729de860ea/content?mode=cognitive-easy

# Get normal mode
GET /api/courses/507f1f77bcf86cd799439011/lessons/507f191e810c19729de860ea/content?mode=normal
```

---

## Error Handling

### If Cognitive Content Generation Fails:

The system will:
1. Log the error
2. Continue with video upload and caption generation
3. Allow manual retry using the `/generate-cognitive-content` endpoint

### Common Issues:

**Issue:** "VTT file not found"  
**Solution:** Ensure captions are generated first

**Issue:** "Transcript too short or empty"  
**Solution:** Check if video has audio and captions were generated properly

**Issue:** "AI API rate limit"  
**Solution:** Implement retry logic or queue system for batch processing

---

## Performance Considerations

### Processing Time:
- Caption generation: 30-60 seconds (depends on video length)
- Cognitive content generation: 15-30 seconds (3 AI calls in parallel)
- Total: ~45-90 seconds per video

### Optimization Tips:
1. **Parallel Processing:** Summary, bullet points, and subtitles are generated in parallel
2. **Caching:** Simplified content is stored in DB, no regeneration needed
3. **Async Processing:** Video upload returns immediately, processing happens in background
4. **Error Recovery:** Failed cognitive processing doesn't block video upload

---

## Future Enhancements

1. **Multiple Languages:** Support for regional languages (Marathi, Hindi, etc.)
2. **Difficulty Levels:** Multiple simplification levels (very easy, easy, moderate)
3. **Audio Summaries:** Text-to-speech for summaries
4. **Visual Aids:** Auto-generate simple diagrams/icons for key points
5. **Progress Tracking:** Show processing status to admin in real-time
6. **Batch Processing:** Generate cognitive content for multiple lessons at once

---

## File Structure

```
backend/
├── services/
│   ├── captionService.js          # Existing: Generates VTT captions
│   └── simplificationService.js   # NEW: AI-powered simplification
├── models/
│   └── Course.js                  # UPDATED: Added cognitiveMode field
├── controllers/
│   └── courseController.js        # UPDATED: Added new endpoints
└── routes/
    └── courseRoutes.js            # UPDATED: Added new routes
```

---

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify API keys are valid and have sufficient quota
3. Ensure FFmpeg is properly installed (for caption generation)
4. Test with a short video first (1-2 minutes)

---

## Summary

✅ **Automatic Workflow:** Videos for cognitive courses auto-generate simplified content  
✅ **Manual Trigger:** Can generate content for existing lessons  
✅ **Dual Modes:** API supports both normal and cognitive-easy content retrieval  
✅ **Modular Design:** Easy to integrate into existing frontend  
✅ **Scalable:** Handles errors gracefully, supports batch processing  
✅ **Database-Backed:** All content persisted, no regeneration needed
