# AWS S3 Integration for EduLife Platform

This document explains how to configure and use AWS S3 for video storage in the EduLife learning platform.

## Overview

The platform supports two storage modes:
1. **AWS S3 Storage** (Recommended for production) - Videos are stored in an S3 bucket with secure access via signed URLs
2. **Local Storage** (Fallback) - Videos are stored on the server's file system (used when S3 is not configured)

## Setup Instructions

### 1. Create an AWS S3 Bucket

1. Log in to your AWS Console
2. Go to S3 and create a new bucket (e.g., `edulife-learning-platform-2025-26-bucket`)
3. Choose your preferred region (e.g., `ap-south-1`)
4. Configure bucket settings:
   - Block public access (recommended - we use signed URLs)
   - Enable versioning (optional but recommended)

### 2. Create an IAM User

1. Go to IAM in AWS Console
2. Create a new user (e.g., `edulife-user`)
3. Attach the following policy (or create a custom one):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:HeadObject"
            ],
            "Resource": [
                "arn:aws:s3:::edulife-learning-platform-2025-26-bucket",
                "arn:aws:s3:::edulife-learning-platform-2025-26-bucket/*"
            ]
        }
    ]
}
```

4. Generate access keys (Access Key ID + Secret Access Key)

### 3. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=edulife-learning-platform-2025-26-bucket
```

### 4. Install Dependencies

```bash
cd backend
npm install
```

The following AWS packages are used:
- `@aws-sdk/client-s3` - S3 client operations
- `@aws-sdk/lib-storage` - Multipart upload support for large videos
- `@aws-sdk/s3-request-presigner` - Generate signed URLs

## How It Works

### Video Upload Flow

1. Admin uploads a video through the CourseUpload form
2. Video is temporarily saved to `backend/temp/` for processing
3. FFmpeg processes the video (captions, simplified video for cognitive mode)
4. All files (video, captions, simplified video) are uploaded to S3
5. S3 keys are stored in MongoDB
6. Temporary local files are cleaned up

### Video Playback Flow

1. Student opens a course
2. Frontend calls `/api/courses/:id/signed` endpoint
3. Backend generates signed URLs for all media files (valid for 2 hours)
4. Frontend plays video using the signed URL
5. Signed URLs expire after 2 hours (security feature)

## S3 Bucket Structure

```
bucket-root/
├── videos/
│   ├── 1234567890_lesson1.mp4           # Original videos
│   ├── 1234567890_lesson1_simplified.mp4 # Cognitive mode videos
│   └── ...
├── subtitles/
│   ├── caption_1234567890_lesson1.vtt    # Original captions
│   ├── caption_1234567890_lesson1_simplified.vtt  # Simplified captions
│   └── ...
```

## API Endpoints

### Get Course with Signed URLs
```
GET /api/courses/:courseId/signed?disabilityType=cognitive
```
Returns course data with pre-signed URLs for all media files.

### Get Lesson-Specific Signed URLs
```
GET /api/courses/:courseId/lessons/:lessonIndex/signed-urls?mode=normal
```
Returns signed URLs for a specific lesson's media.

## Database Schema Changes

The Lesson schema now includes S3 key fields:

```javascript
{
    title: String,
    videoUrl: String,        // Fallback local URL
    videoS3Key: String,      // S3 object key for video
    captionUrl: String,      // Fallback local URL
    captionS3Key: String,    // S3 object key for captions
    cognitiveMode: {
        simplifiedVideoUrl: String,
        simplifiedVideoS3Key: String,
        simplifiedSubtitlesUrl: String,
        simplifiedSubtitlesS3Key: String,
        // ... other fields
    }
}
```

## Fallback Behavior

If S3 is not configured (missing credentials), the system automatically:
1. Stores videos in `backend/uploads/videos/`
2. Stores captions in `backend/uploads/subtitles/`
3. Serves files via Express static middleware

## Security Considerations

1. **Never commit credentials** - Use environment variables
2. **Signed URLs expire** - 2-hour default (configurable)
3. **Bucket is private** - No public access
4. **Delete on course deletion** - S3 objects are cleaned up when courses are deleted

## Troubleshooting

### "S3 credentials not found" warning
- Ensure `.env` file exists with AWS credentials
- Restart the server after adding credentials

### "Failed to upload to S3"
- Check IAM permissions
- Verify bucket name and region
- Check network connectivity

### Videos not playing
- Check signed URL expiration (try refreshing the page)
- Verify CORS configuration on S3 bucket if needed

## CORS Configuration (if needed)

If you encounter CORS issues, add this to your S3 bucket:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
        "ExposeHeaders": ["ETag"]
    }
]
```

## Module Structure

```
backend/
├── Aws.js                     # S3 service module (main)
├── middleware/
│   └── s3UploadMiddleware.js  # Upload handling middleware
├── services/
│   ├── captionService.js      # Caption generation (S3-aware)
│   └── videoSimplificationService.js  # Video processing (S3-aware)
└── controllers/
    └── courseController.js    # Course CRUD with S3 support
```

## Future Improvements

- [ ] CloudFront CDN integration for faster video delivery
- [ ] Video transcoding with AWS MediaConvert
- [ ] Progressive video streaming (HLS)
- [ ] Upload progress tracking in frontend
