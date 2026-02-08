const Course = require('../models/Course');
const { generateCaptions } = require('../services/captionService');
const { processVideoForCognitiveMode } = require('../services/simplificationService');
const { processVideoForCognitive } = require('../services/videoSimplificationService');
const s3Service = require('../Aws');
const { cleanupTempFiles } = require('../middleware/s3UploadMiddleware');
const fs = require('fs');
const path = require('path');

// Generate captions for an existing lesson (on-demand)
exports.generateSubtitlesForLesson = async (req, res) => {
    let tempVideoPath = null;
    
    try {
        const { courseId, lessonId } = req.params;
        
        // Validate required parameters
        if (!courseId) {
            return res.status(400).json({ 
                msg: 'Course ID is required',
                suggestion: 'Please ensure the course ID is provided in the URL'
            });
        }
        
        if (!lessonId) {
            return res.status(400).json({ 
                msg: 'Lesson ID is required',
                suggestion: 'Please ensure the lesson ID is provided in the URL'
            });
        }
        
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ 
                msg: 'Course not found',
                suggestion: 'Please verify the course ID and try again'
            });
        }

        const targetLesson = course.lessons.find(lesson => String(lesson._id) === String(lessonId));

        if (!targetLesson) {
            return res.status(404).json({ 
                msg: 'Lesson not found in this course',
                suggestion: 'Please verify the lesson ID and try again'
            });
        }
        
        // Debug logging
        console.log('🐛 DEBUG - Lesson data:', {
            lessonId: targetLesson._id,
            title: targetLesson.title,
            videoUrl: targetLesson.videoUrl,
            videoS3Key: targetLesson.videoS3Key,
            captionUrl: targetLesson.captionUrl,
            captionS3Key: targetLesson.captionS3Key
        });
        
        if (!targetLesson.videoUrl && !targetLesson.videoS3Key) {
            return res.status(400).json({ 
                msg: 'This lesson has no video file to generate captions from',
                suggestion: 'Please upload a video to this lesson first, then try generating captions',
                lessonTitle: targetLesson.title
            });
        }

        // Allow caller to pass a language (ISO 639-1) via body or query, or use a per-lesson language if present
        const requestedLanguage = req.body?.language || req.query?.language || targetLesson?.language || null;
        
        let videoPath;
        const s3VideoKey = targetLesson.videoS3Key || null;
        
        // Check if video is stored in S3
        if (targetLesson.videoS3Key && s3Service.config.isConfigured) {
            console.log('📥 Downloading video from S3 for caption generation:', targetLesson.videoS3Key);
            
            try {
                // Create temp directory if it doesn't exist
                const tempDir = path.join(__dirname, '../temp');
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
                
                // Download from S3 to temp file
                const videoFileName = path.basename(targetLesson.videoS3Key);
                tempVideoPath = path.join(tempDir, `temp_${Date.now()}_${videoFileName}`);
                
                await s3Service.downloadToLocal(targetLesson.videoS3Key, tempVideoPath);
                videoPath = tempVideoPath;
                console.log('✅ Video downloaded to temp:', tempVideoPath);
            } catch (downloadErr) {
                console.error('❌ Failed to download video from S3:', downloadErr.message);
                return res.status(400).json({ 
                    msg: 'Failed to download video from cloud storage for caption generation',
                    suggestion: 'Please ensure the video exists in cloud storage and try again',
                    videoS3Key: targetLesson.videoS3Key,
                    error: downloadErr.message
                });
            }
        } else if (targetLesson.videoS3Key && !s3Service.config.isConfigured) {
            return res.status(500).json({ 
                msg: 'Video is stored in cloud but cloud service is not configured',
                suggestion: 'Please contact administrator to configure cloud storage settings',
                videoS3Key: targetLesson.videoS3Key
            });
        } else {
            // Video is stored locally - check if file exists
            videoPath = path.join(__dirname, '..', targetLesson.videoUrl);
            
            if (!fs.existsSync(videoPath)) {
                console.error('❌ Video file not found:', videoPath);
                return res.status(400).json({ 
                    msg: 'Video file not found on server. The video may have been moved or deleted.',
                    videoPath: targetLesson.videoUrl,
                    suggestion: 'Please re-upload this video or contact administrator.',
                    lessonTitle: targetLesson.title
                });
            }
        }
        
        // Generate captions
        const captionResult = await generateCaptions(videoPath, requestedLanguage, s3VideoKey);
        
        // Store the caption URL and S3 key on the lesson
        if (typeof captionResult === 'object') {
            targetLesson.captionUrl = captionResult.localUrl;
            if (captionResult.s3Key) {
                targetLesson.captionS3Key = captionResult.s3Key;
            }
        } else {
            // Legacy string return
            targetLesson.captionUrl = captionResult;
        }
        
        await course.save();
        
        // Clean up temp video file
        if (tempVideoPath && fs.existsSync(tempVideoPath)) {
            try {
                fs.unlinkSync(tempVideoPath);
                console.log('🧹 Cleaned up temp video file');
            } catch (cleanupErr) {
                console.warn('⚠️ Failed to cleanup temp video:', cleanupErr.message);
            }
        }

        return res.json({ 
            captionUrl: targetLesson.captionUrl,
            captionS3Key: targetLesson.captionS3Key || null
        });
    } catch (err) {
        // Clean up temp file on error
        if (tempVideoPath && fs.existsSync(tempVideoPath)) {
            try { fs.unlinkSync(tempVideoPath); } catch (e) {}
        }
        
        console.error('❌ Error generating subtitles:', err);
        console.error('Error stack:', err.stack);
        
        // Provide specific error messages based on error type
        let errorResponse = {
            msg: 'Failed to generate captions',
            error: err.message
        };
        
        if (err.message.includes('ffmpeg not found') || err.message.includes('spawn ffmpeg ENOENT')) {
            errorResponse.msg = 'FFmpeg is not installed or not found in system PATH';
            errorResponse.suggestion = 'Please install FFmpeg and restart the server, or contact administrator';
        } else if (err.message.includes('ASSEMBLYAI_API_KEY')) {
            errorResponse.msg = 'Speech recognition service is not configured';
            errorResponse.suggestion = 'Please configure ASSEMBLYAI_API_KEY environment variable';
        } else if (err.message.includes('timeout') || err.message.includes('ECONNABORTED')) {
            errorResponse.msg = 'Caption generation timed out';
            errorResponse.suggestion = 'Video may be too large or network is slow. Please try again or use a smaller video file';
        } else if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
            errorResponse.msg = 'Cannot connect to speech recognition service';
            errorResponse.suggestion = 'Please check internet connection and try again';
        } else if (err.message.includes('invalid video') || err.message.includes('corrupt')) {
            errorResponse.msg = 'Video file is corrupted or in unsupported format';
            errorResponse.suggestion = 'Please re-upload the video in a supported format (MP4, AVI, MOV)';
        } else if (err.code === 'ENOSPC') {
            errorResponse.msg = 'Server disk space full';
            errorResponse.suggestion = 'Please contact administrator - server needs more storage space';
        }
        
        return res.status(500).json(errorResponse);
    }
};

exports.createCourse = async (req, res) => {
    const tempFilesToCleanup = [];
    
    try {
        console.log('Received request body:', req.body);
        console.log('Received files:', req.files);

        let courseData;
        try {
            courseData = JSON.parse(req.body.courseData);
            console.log('Parsed course data:', courseData);
        } catch (error) {
            console.error('Error parsing course data:', error);
            return res.status(400).json({ msg: 'Invalid course data format' });
        }

        // Handle video files, ensuring it's always an array
        const videoFiles = req.files?.lessonVideos ? 
            (Array.isArray(req.files.lessonVideos) ? req.files.lessonVideos : [req.files.lessonVideos]) 
            : [];
        console.log('Processed video files:', videoFiles.map(f => f.filename));

        // Basic validation
        if (!courseData.subject || !courseData.standard) {
            return res.status(400).json({ 
                msg: 'Subject and standard are required',
                received: { 
                    subject: courseData.subject,
                    standard: courseData.standard
                }
            });
        }

        // Convert standard to number
        courseData.standard = parseInt(courseData.standard, 10);
        if (isNaN(courseData.standard) || courseData.standard < 7 || courseData.standard > 10) {
            return res.status(400).json({ 
                msg: 'Standard must be a number between 7 and 10',
                received: courseData.standard 
            });
        }

        // Initialize empty lessons array if not provided
        const lessons = courseData.lessons || [];
        console.log('Initial lessons:', lessons);

        // Process each lesson with its video
        const processedLessons = await Promise.all(lessons.map(async (lesson, index) => {
            const videoFile = videoFiles[index];
            const processedLesson = {
                title: lesson.title,
                videoUrl: null,
                videoS3Key: null,
                captionUrl: null,
                captionS3Key: null
            };

            if (videoFile) {
                // Track temp file for cleanup
                tempFilesToCleanup.push(videoFile.path);
                
                // Generate S3 key for the video
                const s3VideoKey = s3Service.generateVideoKey(videoFile.originalname, 'videos');
                
                console.log(`Processing video for lesson ${index}:`, videoFile.filename);
                console.log(`S3 Key: ${s3VideoKey}`);

                try {
                    // Upload original video to S3
                    if (s3Service.config.isConfigured) {
                        await s3Service.uploadLocalFile(videoFile.path, s3VideoKey, videoFile.mimetype || 'video/mp4');
                        processedLesson.videoS3Key = s3VideoKey;
                        processedLesson.videoUrl = null; // Will be served via signed URL
                        console.log(`✅ Video uploaded to S3: ${s3VideoKey}`);
                    } else {
                        // Fallback to local storage
                        const localVideoDir = path.join(__dirname, '../uploads/videos');
                        if (!fs.existsSync(localVideoDir)) {
                            fs.mkdirSync(localVideoDir, { recursive: true });
                        }
                        const localVideoPath = path.join(localVideoDir, videoFile.filename);
                        fs.copyFileSync(videoFile.path, localVideoPath);
                        processedLesson.videoUrl = `/uploads/videos/${videoFile.filename}`;
                        console.log(`📁 Video saved locally: ${processedLesson.videoUrl}`);
                    }

                    // Generate captions
                    const lessonLanguage = lesson?.language || req.body?.language || null;
                    const captionResult = await generateCaptions(videoFile.path, lessonLanguage, s3VideoKey);
                    
                    if (captionResult.isS3) {
                        processedLesson.captionS3Key = captionResult.s3Key;
                        processedLesson.captionUrl = null; // Will be served via signed URL
                    } else {
                        processedLesson.captionUrl = captionResult.localUrl;
                    }
                    console.log(`Generated captions for lesson ${index}`);
                    
                    // Track the temp VTT file for cleanup after cognitive processing
                    const vttTempPath = path.join(__dirname, '..', 'temp', 'subtitles', `caption_${path.basename(videoFile.filename, path.extname(videoFile.filename))}.vtt`);
                    tempFilesToCleanup.push(vttTempPath);
                    
                    // Generate cognitive-friendly content
                    try {
                        console.log(`Generating cognitive-friendly content for lesson ${index}...`);
                        
                        // 1. Create simplified video (slowed down to 0.75x)
                        const simplifiedVideoResult = await processVideoForCognitive(videoFile.path, captionResult.localUrl || captionResult.s3Key, s3VideoKey);
                        tempFilesToCleanup.push(simplifiedVideoResult.simplifiedVideoLocalPath);
                        
                        // 2. Generate text simplification
                        const captionUrlForProcessing = captionResult.localUrl || captionResult.s3Key;
                        const simplifiedVideoPath = simplifiedVideoResult.simplifiedVideoLocalPath;
                        const simplifiedTextContent = await processVideoForCognitiveMode(captionUrlForProcessing, simplifiedVideoPath);
                        
                        // Store cognitive mode data with S3 keys
                        processedLesson.cognitiveMode = {
                            ...simplifiedTextContent,
                            simplifiedVideoUrl: simplifiedVideoResult.isS3 ? null : simplifiedVideoResult.simplifiedVideoUrl,
                            simplifiedVideoS3Key: simplifiedVideoResult.s3Key || null,
                            processingStatus: simplifiedVideoResult.processingStatus
                        };
                        
                        console.log(`✅ Cognitive content generated for lesson ${index}:`, {
                            hasSimplifiedVideo: !!simplifiedVideoResult.s3Key || !!simplifiedVideoResult.simplifiedVideoUrl,
                            status: simplifiedVideoResult.processingStatus,
                            isS3: simplifiedVideoResult.isS3
                        });
                    } catch (cognitiveError) {
                        console.error(`Cognitive content generation failed for lesson ${index}:`, cognitiveError);
                        processedLesson.cognitiveMode = {
                            processingStatus: 'failed',
                            error: cognitiveError.message
                        };
                    }
                } catch (captionError) {
                    console.error(`Caption generation failed for ${videoFile.filename}:`, captionError);
                }
            }

            return processedLesson;
        }));

        console.log('Processed lessons:', processedLessons);

        // Create new course with processed data
        const newCourse = new Course({
            subject: courseData.subject,
            standard: courseData.standard,
            disabilityType: courseData.disabilityType,
            lessons: processedLessons
        });

        console.log('Attempting to save course:', {
            subject: newCourse.subject,
            standard: newCourse.standard,
            disabilityType: newCourse.disabilityType,
            lessonCount: newCourse.lessons.length
        });

        const savedCourse = await newCourse.save();
        console.log('Course saved successfully:', savedCourse._id);
        
        // Cleanup temp files
        cleanupTempFiles(tempFilesToCleanup);
        
        res.status(201).json(savedCourse);

    } catch (err) {
        console.error("Error creating course:", err.message);
        // Cleanup temp files on error
        cleanupTempFiles(tempFilesToCleanup);
        res.status(500).send('Server Error');
    }
};

exports.getStudentCourses = async (req, res) => {
    try {
        const { disabilityType, standard } = req.params;
        
        console.log('Fetching courses for:', { disabilityType, standard });
        
        // Convert standard to number
        const standardNum = parseInt(standard, 10);
        if (isNaN(standardNum) || standardNum < 7 || standardNum > 10) {
            return res.status(400).json({ msg: 'Invalid standard value' });
        }

        console.log('Searching with criteria:', {
            standard: standardNum
        });

        // Fetch all courses for the standard (disability-agnostic)
        // Also include legacy courses with specific disabilityType for backward compatibility
        const courses = await Course.find({
            $or: [
                { disabilityType: { $exists: false } },  // New courses without disability type
                { disabilityType: null },                 // New courses with null disability
                { disabilityType: disabilityType }        // Legacy courses with specific disability
            ],
            standard: standardNum
        }).sort({ subject: 1 }); // Sort by subject name

        console.log('Found courses:', courses.length);
        console.log('Course details:', courses.map(c => ({
            id: c._id,
            subject: c.subject,
            standard: c.standard,
            disabilityType: c.disabilityType || 'all',
            lessonsCount: c.lessons.length
        })));

        res.json(courses);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getCourses = async (req, res) => {
    try {
        const courses = await Course.find();
        res.json(courses);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ msg: 'Course not found' });
        }
        res.json(course);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Get lesson content with mode selection (normal or cognitive-easy)
exports.getLessonContent = async (req, res) => {
    try {
        const { courseId, lessonId } = req.params;
        const { mode } = req.query; // 'normal' or 'cognitive-easy'
        
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ msg: 'Course not found' });
        }
        
        const lesson = course.lessons.id(lessonId);
        if (!lesson) {
            return res.status(404).json({ msg: 'Lesson not found' });
        }
        
        // Prepare response based on mode
        const response = {
            lessonId: lesson._id,
            title: lesson.title,
            videoUrl: lesson.videoUrl
        };
        
        if (mode === 'cognitive-easy') {
            // Return simplified content
            if (!lesson.cognitiveMode) {
                return res.status(404).json({ 
                    msg: 'Cognitive-friendly content not available for this lesson',
                    suggestion: 'Use the /generate-cognitive-content endpoint to create it'
                });
            }
            
            response.mode = 'cognitive-easy';
            response.content = {
                summary: lesson.cognitiveMode.simplifiedSummary,
                keyPoints: lesson.cognitiveMode.keyPoints,
                subtitlesUrl: lesson.cognitiveMode.simplifiedSubtitlesUrl,
                transcript: lesson.cognitiveMode.transcript
            };
        } else {
            // Return normal content
            response.mode = 'normal';
            response.content = {
                textContent: lesson.textContent,
                subtitlesUrl: lesson.captionUrl,
                audioLessonUrl: lesson.audioLessonUrl
            };
        }
        
        res.json(response);
        
    } catch (err) {
        console.error('Error getting lesson content:', err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
};

// Manually generate cognitive-friendly content for an existing lesson
exports.generateCognitiveContentForLesson = async (req, res) => {
    try {
        const { courseId, lessonId } = req.params;
        
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ msg: 'Course not found' });
        }
        
        const lesson = course.lessons.id(lessonId);
        if (!lesson) {
            return res.status(404).json({ msg: 'Lesson not found' });
        }
        
        if (!lesson.captionUrl) {
            return res.status(400).json({ 
                msg: 'No captions available for this lesson',
                suggestion: 'Generate captions first using /generate-subtitles endpoint'
            });
        }
        
        // Check if simplified video exists and construct path
        let simplifiedVideoPath = null;
        if (lesson.cognitiveMode && lesson.cognitiveMode.simplifiedVideoUrl) {
            simplifiedVideoPath = path.join(__dirname, '..', lesson.cognitiveMode.simplifiedVideoUrl);
            console.log(`Using existing simplified video for subtitle generation: ${simplifiedVideoPath}`);
        }
        
        // Generate simplified content
        console.log(`Manually generating cognitive content for lesson ${lessonId}...`);
        const simplifiedContent = await processVideoForCognitiveMode(lesson.captionUrl, simplifiedVideoPath);
        
        // Update lesson with cognitive content
        lesson.cognitiveMode = simplifiedContent;
        await course.save();
        
        res.json({
            msg: 'Cognitive-friendly content generated successfully',
            content: simplifiedContent
        });
        
    } catch (err) {
        console.error('Error generating cognitive content:', err.message);
        res.status(500).json({ msg: 'Failed to generate cognitive content', error: err.message });
    }
};

// Get course with content mode comparison (both normal and cognitive-easy)
exports.getCourseWithModes = async (req, res) => {
    try {
        const { courseId } = req.params;
        
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ msg: 'Course not found' });
        }
        
        // Format response with both modes
        const formattedCourse = {
            _id: course._id,
            subject: course.subject,
            standard: course.standard,
            disabilityType: course.disabilityType,
            lessons: course.lessons.map(lesson => ({
                _id: lesson._id,
                title: lesson.title,
                videoUrl: lesson.videoUrl,
                normalMode: {
                    textContent: lesson.textContent,
                    captionUrl: lesson.captionUrl,
                    audioLessonUrl: lesson.audioLessonUrl
                },
                cognitiveEasyMode: lesson.cognitiveMode ? {
                    simplifiedSummary: lesson.cognitiveMode.simplifiedSummary,
                    keyPoints: lesson.cognitiveMode.keyPoints,
                    simplifiedSubtitlesUrl: lesson.cognitiveMode.simplifiedSubtitlesUrl,
                    transcript: lesson.cognitiveMode.transcript,
                    processedAt: lesson.cognitiveMode.processedAt
                } : null
            }))
        };
        
        res.json(formattedCourse);
        
    } catch (err) {
        console.error('Error getting course with modes:', err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
};

exports.deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ msg: 'Course not found' });
        }

        // Delete files from S3 if configured
        if (s3Service.config.isConfigured) {
            for (const lesson of course.lessons) {
                try {
                    if (lesson.videoS3Key) {
                        await s3Service.deleteObject(lesson.videoS3Key);
                    }
                    if (lesson.captionS3Key) {
                        await s3Service.deleteObject(lesson.captionS3Key);
                    }
                    if (lesson.cognitiveMode?.simplifiedVideoS3Key) {
                        await s3Service.deleteObject(lesson.cognitiveMode.simplifiedVideoS3Key);
                    }
                    if (lesson.cognitiveMode?.simplifiedSubtitlesS3Key) {
                        await s3Service.deleteObject(lesson.cognitiveMode.simplifiedSubtitlesS3Key);
                    }
                } catch (deleteError) {
                    console.warn(`Failed to delete S3 files for lesson:`, deleteError.message);
                }
            }
        }

        // Delete local files if they exist
        course.lessons.forEach(lesson => {
            if (lesson.videoUrl) {
                const videoPath = path.join(__dirname, '..', lesson.videoUrl);
                if (fs.existsSync(videoPath)) {
                    fs.unlinkSync(videoPath);
                }
            }
            if (lesson.captionUrl) {
                const captionPath = path.join(__dirname, '..', lesson.captionUrl);
                if (fs.existsSync(captionPath)) {
                    fs.unlinkSync(captionPath);
                }
            }
        });

        await Course.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Course deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// ============================================================================
// S3 SIGNED URL ENDPOINTS
// ============================================================================

/**
 * Get signed URLs for a specific lesson's media files
 * This endpoint resolves S3 keys to temporary signed URLs
 */
exports.getLessonSignedUrls = async (req, res) => {
    try {
        const { courseId, lessonIndex } = req.params;
        const { mode } = req.query; // 'normal' or 'cognitive'
        
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ msg: 'Course not found' });
        }
        
        const lessonIdx = parseInt(lessonIndex, 10);
        if (isNaN(lessonIdx) || lessonIdx < 0 || lessonIdx >= course.lessons.length) {
            return res.status(404).json({ msg: 'Lesson not found' });
        }
        
        const lesson = course.lessons[lessonIdx];
        const urls = {};
        
        // URL expiration: 2 hours (enough for watching a video)
        const expiresIn = 7200;
        
        try {
            // Determine which video to serve based on mode
            if (mode === 'cognitive' && lesson.cognitiveMode) {
                // Cognitive mode - serve simplified video
                if (lesson.cognitiveMode.simplifiedVideoS3Key && s3Service.config.isConfigured) {
                    urls.videoUrl = await s3Service.getSignedDownloadUrl(lesson.cognitiveMode.simplifiedVideoS3Key, expiresIn);
                } else if (lesson.cognitiveMode.simplifiedVideoUrl) {
                    urls.videoUrl = `http://localhost:5000${lesson.cognitiveMode.simplifiedVideoUrl}`;
                }
                
                // Simplified subtitles
                if (lesson.cognitiveMode.simplifiedSubtitlesS3Key && s3Service.config.isConfigured) {
                    urls.captionUrl = await s3Service.getSignedDownloadUrl(lesson.cognitiveMode.simplifiedSubtitlesS3Key, expiresIn);
                } else if (lesson.cognitiveMode.simplifiedSubtitlesUrl) {
                    urls.captionUrl = `http://localhost:5000${lesson.cognitiveMode.simplifiedSubtitlesUrl}`;
                }
            } else {
                // Normal mode - serve original video
                if (lesson.videoS3Key && s3Service.config.isConfigured) {
                    urls.videoUrl = await s3Service.getSignedDownloadUrl(lesson.videoS3Key, expiresIn);
                } else if (lesson.videoUrl) {
                    urls.videoUrl = `http://localhost:5000${lesson.videoUrl}`;
                }
                
                // Original captions
                if (lesson.captionS3Key && s3Service.config.isConfigured) {
                    urls.captionUrl = await s3Service.getSignedDownloadUrl(lesson.captionS3Key, expiresIn);
                } else if (lesson.captionUrl) {
                    urls.captionUrl = `http://localhost:5000${lesson.captionUrl}`;
                }
            }
        } catch (urlError) {
            console.error('Error generating signed URLs:', urlError.message);
            // Fall back to local URLs if S3 fails
            if (mode === 'cognitive' && lesson.cognitiveMode?.simplifiedVideoUrl) {
                urls.videoUrl = `http://localhost:5000${lesson.cognitiveMode.simplifiedVideoUrl}`;
                urls.captionUrl = lesson.cognitiveMode.simplifiedSubtitlesUrl ? 
                    `http://localhost:5000${lesson.cognitiveMode.simplifiedSubtitlesUrl}` : null;
            } else {
                urls.videoUrl = lesson.videoUrl ? `http://localhost:5000${lesson.videoUrl}` : null;
                urls.captionUrl = lesson.captionUrl ? `http://localhost:5000${lesson.captionUrl}` : null;
            }
        }
        
        res.json({
            lessonId: lesson._id,
            lessonIndex: lessonIdx,
            title: lesson.title,
            mode: mode || 'normal',
            isS3: s3Service.config.isConfigured && !!(lesson.videoS3Key || lesson.cognitiveMode?.simplifiedVideoS3Key),
            ...urls
        });
        
    } catch (err) {
        console.error('Error getting lesson signed URLs:', err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
};

/**
 * Get course with all lesson URLs resolved (signed URLs for S3 content)
 * This is used by the frontend to get playable video URLs
 */
exports.getCourseWithSignedUrls = async (req, res) => {
    try {
        const { id } = req.params;
        const { disabilityType } = req.query; // User's disability type
        
        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ msg: 'Course not found' });
        }
        
        const expiresIn = 7200; // 2 hours
        const isCognitive = disabilityType === 'cognitive';
        
        // Process lessons and generate signed URLs
        const lessonsWithUrls = await Promise.all(course.lessons.map(async (lesson, index) => {
            const lessonData = {
                _id: lesson._id,
                title: lesson.title,
                videoUrl: null,
                captionUrl: null,
                cognitiveMode: null
            };
            
            try {
                // For cognitive users, prefer simplified content
                if (isCognitive && lesson.cognitiveMode) {
                    // Simplified video URL
                    if (lesson.cognitiveMode.simplifiedVideoS3Key && s3Service.config.isConfigured) {
                        lessonData.videoUrl = await s3Service.getSignedDownloadUrl(lesson.cognitiveMode.simplifiedVideoS3Key, expiresIn);
                    } else if (lesson.cognitiveMode.simplifiedVideoUrl) {
                        lessonData.videoUrl = `http://localhost:5000${lesson.cognitiveMode.simplifiedVideoUrl}`;
                    }
                    
                    // Simplified captions URL
                    if (lesson.cognitiveMode.simplifiedSubtitlesS3Key && s3Service.config.isConfigured) {
                        lessonData.captionUrl = await s3Service.getSignedDownloadUrl(lesson.cognitiveMode.simplifiedSubtitlesS3Key, expiresIn);
                    } else if (lesson.cognitiveMode.simplifiedSubtitlesUrl) {
                        lessonData.captionUrl = `http://localhost:5000${lesson.cognitiveMode.simplifiedSubtitlesUrl}`;
                    }
                    
                    // Include cognitive mode metadata
                    lessonData.cognitiveMode = {
                        simplifiedSummary: lesson.cognitiveMode.simplifiedSummary,
                        keyPoints: lesson.cognitiveMode.keyPoints,
                        processingStatus: lesson.cognitiveMode.processingStatus
                    };
                }
                
                // Always include original video URLs (for non-cognitive users or as fallback)
                if (!lessonData.videoUrl) {
                    if (lesson.videoS3Key && s3Service.config.isConfigured) {
                        lessonData.videoUrl = await s3Service.getSignedDownloadUrl(lesson.videoS3Key, expiresIn);
                    } else if (lesson.videoUrl) {
                        lessonData.videoUrl = `http://localhost:5000${lesson.videoUrl}`;
                    }
                }
                
                if (!lessonData.captionUrl) {
                    if (lesson.captionS3Key && s3Service.config.isConfigured) {
                        lessonData.captionUrl = await s3Service.getSignedDownloadUrl(lesson.captionS3Key, expiresIn);
                    } else if (lesson.captionUrl) {
                        lessonData.captionUrl = `http://localhost:5000${lesson.captionUrl}`;
                    }
                }
            } catch (urlError) {
                console.warn(`Error generating URLs for lesson ${index}:`, urlError.message);
                // Fallback to local URLs
                lessonData.videoUrl = lesson.videoUrl ? `http://localhost:5000${lesson.videoUrl}` : null;
                lessonData.captionUrl = lesson.captionUrl ? `http://localhost:5000${lesson.captionUrl}` : null;
            }
            
            return lessonData;
        }));
        
        res.json({
            _id: course._id,
            subject: course.subject,
            standard: course.standard,
            disabilityType: course.disabilityType,
            lessons: lessonsWithUrls,
            isS3Enabled: s3Service.config.isConfigured
        });
        
    } catch (err) {
        console.error('Error getting course with signed URLs:', err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
};