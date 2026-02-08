# API ENDPOINTS - Quick Reference

## Cognitive Mode API Endpoints

### 1. Get Lesson Content by Mode
**Endpoint:** `GET /api/courses/:courseId/lessons/:lessonId/content`

**Query Parameters:**
- `mode` (optional): `"normal"` or `"cognitive-easy"` (default: `"normal"`)

**Example Requests:**
```bash
# Get normal mode content
curl http://localhost:5000/api/courses/507f1f77bcf86cd799439011/lessons/507f191e810c19729de860ea/content?mode=normal

# Get cognitive-easy mode content
curl http://localhost:5000/api/courses/507f1f77bcf86cd799439011/lessons/507f191e810c19729de860ea/content?mode=cognitive-easy
```

**Success Response (Cognitive-Easy Mode):**
```json
{
  "lessonId": "507f191e810c19729de860ea",
  "title": "Introduction to Photosynthesis",
  "videoUrl": "/uploads/videos/lessonVideos-1762447760288.mp4",
  "mode": "cognitive-easy",
  "content": {
    "summary": "Plants make their own food using sunlight. They take in water and air. The leaves do the work. Plants need light to grow. They make oxygen for us to breathe. This process is called photosynthesis.",
    "keyPoints": [
      "Plants make their own food",
      "They use sunlight and water",
      "Leaves do the work",
      "Plants give us oxygen",
      "This is called photosynthesis"
    ],
    "subtitlesUrl": "/uploads/subtitles/caption_lessonVideos-1762447760288_simplified.vtt",
    "transcript": "Full transcript text..."
  }
}
```

**Success Response (Normal Mode):**
```json
{
  "lessonId": "507f191e810c19729de860ea",
  "title": "Introduction to Photosynthesis",
  "videoUrl": "/uploads/videos/lessonVideos-1762447760288.mp4",
  "mode": "normal",
  "content": {
    "textContent": "Full lesson text content...",
    "subtitlesUrl": "/uploads/subtitles/caption_lessonVideos-1762447760288.vtt",
    "audioLessonUrl": "/uploads/audio/lesson.mp3"
  }
}
```

**Error Response (404):**
```json
{
  "msg": "Cognitive-friendly content not available for this lesson",
  "suggestion": "Use the /generate-cognitive-content endpoint to create it"
}
```

---

### 2. Get Course with Both Modes
**Endpoint:** `GET /api/courses/:courseId/modes`

**Example Request:**
```bash
curl http://localhost:5000/api/courses/507f1f77bcf86cd799439011/modes
```

**Success Response:**
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
        "captionUrl": "/uploads/subtitles/caption_lesson1.vtt",
        "audioLessonUrl": null
      },
      "cognitiveEasyMode": {
        "simplifiedSummary": "Plants make food using sunlight...",
        "keyPoints": [
          "Plants make their own food",
          "They use sunlight and water"
        ],
        "simplifiedSubtitlesUrl": "/uploads/subtitles/caption_lesson1_simplified.vtt",
        "transcript": "Full transcript...",
        "processedAt": "2025-01-15T10:30:00.000Z"
      }
    }
  ]
}
```

---

### 3. Manually Generate Cognitive Content
**Endpoint:** `POST /api/courses/:courseId/lessons/:lessonId/generate-cognitive-content`

**Example Request:**
```bash
curl -X POST http://localhost:5000/api/courses/507f1f77bcf86cd799439011/lessons/507f191e810c19729de860ea/generate-cognitive-content
```

**Success Response:**
```json
{
  "msg": "Cognitive-friendly content generated successfully",
  "content": {
    "transcript": "Full extracted transcript...",
    "simplifiedSummary": "Plants make food...",
    "keyPoints": [
      "Plants make their own food",
      "They use sunlight and water"
    ],
    "simplifiedSubtitlesUrl": "/uploads/subtitles/caption_xyz_simplified.vtt",
    "processedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "msg": "No captions available for this lesson",
  "suggestion": "Generate captions first using /generate-subtitles endpoint"
}
```

---

### 4. Generate Subtitles (Existing Endpoint)
**Endpoint:** `POST /api/courses/:courseId/lessons/:lessonId/generate-subtitles`

**Request Body (optional):**
```json
{
  "language": "en"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:5000/api/courses/507f1f77bcf86cd799439011/lessons/507f191e810c19729de860ea/generate-subtitles \
  -H "Content-Type: application/json" \
  -d '{"language": "en"}'
```

**Success Response:**
```json
{
  "captionUrl": "/uploads/subtitles/caption_lessonVideos-1762447760288.vtt"
}
```

---

## Existing Course Endpoints

### 5. Create Course (Enhanced with Automatic Cognitive Processing)
**Endpoint:** `POST /api/courses`

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `courseData` (JSON string):
  ```json
  {
    "subject": "Science",
    "standard": 8,
    "disabilityType": "cognitive",
    "lessons": [
      {
        "title": "Photosynthesis Basics"
      }
    ]
  }
  ```
- `lessonVideos` (file array): Video files for each lesson

**Automatic Behavior:**
- If `disabilityType === 'cognitive'`, the system will:
  1. Upload video
  2. Generate captions (VTT file)
  3. Extract transcript from captions
  4. Generate simplified summary
  5. Generate key bullet points
  6. Generate simplified subtitles
  7. Store everything in the database

**Example using JavaScript Fetch:**
```javascript
const formData = new FormData();
formData.append('courseData', JSON.stringify({
  subject: 'Science',
  standard: 8,
  disabilityType: 'cognitive',
  lessons: [
    { title: 'Photosynthesis Basics' }
  ]
}));
formData.append('lessonVideos', videoFile);

const response = await fetch('http://localhost:5000/api/courses', {
  method: 'POST',
  body: formData
});
```

---

### 6. Get All Courses
**Endpoint:** `GET /api/courses`

**Example Request:**
```bash
curl http://localhost:5000/api/courses
```

---

### 7. Get Course by ID
**Endpoint:** `GET /api/courses/:id`

**Example Request:**
```bash
curl http://localhost:5000/api/courses/507f1f77bcf86cd799439011
```

---

### 8. Get Student Courses
**Endpoint:** `GET /api/courses/student/:disabilityType/:standard`

**Example Request:**
```bash
curl http://localhost:5000/api/courses/student/cognitive/8
```

---

## Response Status Codes

- `200 OK` - Request successful
- `201 Created` - Course created successfully
- `400 Bad Request` - Invalid parameters or missing required fields
- `404 Not Found` - Course or lesson not found
- `500 Internal Server Error` - Server or processing error

---

## Testing with cURL

### Test Complete Workflow

```bash
# 1. Create a cognitive course (this will auto-generate simplified content)
curl -X POST http://localhost:5000/api/courses \
  -F 'courseData={"subject":"Science","standard":8,"disabilityType":"cognitive","lessons":[{"title":"Test Lesson"}]}' \
  -F 'lessonVideos=@path/to/video.mp4'

# 2. Get the course ID from response, then fetch content in cognitive-easy mode
curl http://localhost:5000/api/courses/COURSE_ID/lessons/LESSON_ID/content?mode=cognitive-easy

# 3. Get course with both modes for comparison
curl http://localhost:5000/api/courses/COURSE_ID/modes

# 4. Manually generate cognitive content for existing lesson
curl -X POST http://localhost:5000/api/courses/COURSE_ID/lessons/LESSON_ID/generate-cognitive-content
```

---

## Frontend Integration Examples

### React Hook for Mode Selection

```javascript
import { useState, useEffect } from 'react';

function useLessonContent(courseId, lessonId, mode = 'normal') {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/lessons/${lessonId}/content?mode=${mode}`)
      .then(res => res.json())
      .then(data => setContent(data))
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, [courseId, lessonId, mode]);

  return { content, loading, error };
}

// Usage:
const { content, loading } = useLessonContent(courseId, lessonId, 'cognitive-easy');
```

---

## Error Handling

### Common Errors and Solutions

**Error:** "Cognitive-friendly content not available"
```json
{
  "msg": "Cognitive-friendly content not available for this lesson",
  "suggestion": "Use the /generate-cognitive-content endpoint to create it"
}
```
**Solution:** Use the manual generation endpoint:
```bash
POST /api/courses/:courseId/lessons/:lessonId/generate-cognitive-content
```

---

**Error:** "No captions available for this lesson"
```json
{
  "msg": "No captions available for this lesson",
  "suggestion": "Generate captions first using /generate-subtitles endpoint"
}
```
**Solution:** Generate captions first:
```bash
POST /api/courses/:courseId/lessons/:lessonId/generate-subtitles
```

---

**Error:** "VTT file not found"
**Solution:** Check that the video has been uploaded and captions have been generated.

---

## Rate Limits and Performance

- **Caption Generation:** 30-60 seconds per video (depends on length)
- **Cognitive Content Generation:** 15-30 seconds (3 AI API calls in parallel)
- **Total Time:** ~45-90 seconds for complete workflow

**Tip:** For better user experience, show a loading indicator during processing.

---

## Database Schema Reference

```javascript
// Lesson Schema
{
  title: String,
  videoUrl: String,
  captionUrl: String,
  
  cognitiveMode: {
    transcript: String,              // Full transcript
    simplifiedSummary: String,       // Easy-to-read summary
    keyPoints: [String],             // 5-7 bullet points
    simplifiedSubtitlesUrl: String,  // Simplified VTT URL
    processedAt: Date                // Generation timestamp
  }
}
```

---

## Support & Troubleshooting

1. **Check API Keys:** Ensure `GEMINI_API_KEY` is set in `.env`
2. **Check FFmpeg:** Ensure FFmpeg is installed for caption generation
3. **Check Logs:** Review server console for detailed error messages
4. **Test Script:** Run `node scripts/test_cognitive_mode.js` to test individual functions

---

## Quick Start Checklist

✅ Update Course model with cognitiveMode field  
✅ Add simplificationService.js to services folder  
✅ Update courseController.js with new endpoints  
✅ Add new routes to courseRoutes.js  
✅ Verify GEMINI_API_KEY in .env file  
✅ Test with sample video upload  
✅ Integrate frontend with mode toggle  

---

**Last Updated:** January 15, 2025  
**Version:** 1.0.0
