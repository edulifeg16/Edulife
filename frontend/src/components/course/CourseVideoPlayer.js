// src/components/course/CourseVideoPlayer.js

import React, { useContext, useEffect, useRef, useState } from 'react';
import api, { SERVER_BASE_URL } from '../../api/apiConfig';
import { ThemeContext } from '../../context/ThemeContext'; // We need this for the global caption toggle

const CourseVideoPlayer = ({ lesson, courseId, onUpdateLesson, disabilityType, userDisabilityType, videoRef }) => {
    const { captionsEnabled } = useContext(ThemeContext);
    //const videoRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [cues, setCues] = useState([]);
    const [currentCueIndex, setCurrentCueIndex] = useState(-1);
    const [showTranscript, setShowTranscript] = useState(false);
    const transcriptRef = useRef(null);

    // Mode: 'normal' (default) or 'cognitive' (easy mode)
    // Auto-set to cognitive if user has cognitive disability
    const [mode] = useState(userDisabilityType === 'cognitive' ? 'cognitive' : 'normal');
    const [cognitiveContent, setCognitiveContent] = useState(null);
    const [subtitleUrlForMode, setSubtitleUrlForMode] = useState(null);

    // Utility function to convert time string to seconds
    function toSeconds(timeStr) {
        const parts = timeStr.split(':').map(p => p.replace(',', '.'));
        if (parts.length === 3) {
            return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
        }
        if (parts.length === 2) {
            return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
        }
        return parseFloat(timeStr);
    }

    // Helper to resolve video/caption URLs
    // Now handles both S3 signed URLs (already complete) and local URLs
    const resolveUrl = (url) => {
        if (!url) return null;
        // If it's already a complete URL (S3 signed or http), use as-is
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        // Otherwise, it's a local path - prepend server URL
        return `${SERVER_BASE_URL}${url}`;
    };

    // Get the correct video URL based on user disability type
    const getVideoUrl = () => {
        // If lesson already has pre-resolved URLs (from signed endpoint), use directly
        if (lesson?.videoUrl && (lesson.videoUrl.startsWith('http://') || lesson.videoUrl.startsWith('https://'))) {
            return lesson.videoUrl;
        }
        
        // Fallback for legacy data without pre-resolved URLs
        // Cognitive user + simplified video exists = serve simplified
        if (userDisabilityType === 'cognitive' && lesson?.cognitiveMode?.simplifiedVideoUrl) {
            return resolveUrl(lesson.cognitiveMode.simplifiedVideoUrl);
        }
        // Everyone else or cognitive without simplified = serve original
        return lesson && lesson.videoUrl ? resolveUrl(lesson.videoUrl) : null;
    };
    
    // Get the correct subtitle URL based on user disability type
    const getCaptionUrl = () => {
        // If lesson already has pre-resolved URLs (from signed endpoint), use directly
        if (lesson?.captionUrl && (lesson.captionUrl.startsWith('http://') || lesson.captionUrl.startsWith('https://'))) {
            return lesson.captionUrl;
        }
        
        // Fallback for legacy data
        // Cognitive user + simplified subtitles exist = serve simplified
        if (userDisabilityType === 'cognitive' && lesson?.cognitiveMode?.simplifiedSubtitlesUrl) {
            return resolveUrl(lesson.cognitiveMode.simplifiedSubtitlesUrl);
        }
        // Everyone else or cognitive without simplified = serve original
        return lesson && lesson.captionUrl ? resolveUrl(lesson.captionUrl) : null;
    };
    
    const fullVideoUrl = getVideoUrl();
    const fullCaptionUrl = getCaptionUrl();

    // This makes sure captions turn on/off when the global setting changes
    useEffect(() => {
        if (!videoRef.current || !videoRef.current.textTracks[0]) return;
        videoRef.current.textTracks[0].mode = captionsEnabled ? 'showing' : 'hidden';
    }, [captionsEnabled, videoRef]);

    // Handle video timeupdate to highlight current caption
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            const currentTime = video.currentTime;
            const index = cues.findIndex(cue => currentTime >= cue.start && currentTime <= cue.end);
            
            if (index !== currentCueIndex) {
                setCurrentCueIndex(index);
                // Scroll the current cue into view if it's not visible
                if (index !== -1 && transcriptRef.current) {
                    const cueElement = transcriptRef.current.children[index];
                    if (cueElement) {
                        cueElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, [cues, currentCueIndex, videoRef]);

    // Voice commands: Show/Hide transcript
    useEffect(() => {
        const handleVoiceShowTranscript = () => {
            console.log('🎤 CourseVideoPlayer: Showing transcript via voice command');
            setShowTranscript(true);
        };

        const handleVoiceHideTranscript = () => {
            console.log('🎤 CourseVideoPlayer: Hiding transcript via voice command');
            setShowTranscript(false);
        };

        window.addEventListener('voice-show-transcript', handleVoiceShowTranscript);
        window.addEventListener('voice-hide-transcript', handleVoiceHideTranscript);

        return () => {
            window.removeEventListener('voice-show-transcript', handleVoiceShowTranscript);
            window.removeEventListener('voice-hide-transcript', handleVoiceHideTranscript);
        };
    }, []);

    // Load cues when caption URL becomes available
    useEffect(() => {
        // Simple VTT parser to get cues for transcript display
        function parseVTT(vttText) {
            if (!vttText) return [];
            const lines = vttText.split(/\r?\n/);
            const parsedCues = [];
            let i = 0;
            while (i < lines.length) {
                const line = lines[i].trim();
                if (!line) { i++; continue; }
                // Skip header
                if (line.startsWith('WEBVTT') || line.startsWith('NOTE')) { i++; continue; }
                // If line contains --> it's a time line
                let timeLine = line;
                if (!line.includes('-->')) {
                    i++; if (i >= lines.length) break; timeLine = lines[i].trim();
                }
                const match = timeLine.match(/(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/);
                if (match) {
                    const start = toSeconds(match[1]);
                    const end = toSeconds(match[2]);
                    i++;
                    const textLines = [];
                    while (i < lines.length && lines[i].trim()) { textLines.push(lines[i]); i++; }
                    parsedCues.push({ start, end, text: textLines.join('\n') });
                } else {
                    i++;
                }
            }
            return parsedCues;
        }

        let cancelled = false;
        const loadVtt = async () => {
            setCues([]);
            if (!fullCaptionUrl) return;
            try {
                const res = await fetch(fullCaptionUrl);
                if (cancelled) return;
                const text = await res.text();
                const parsed = parseVTT(text);
                setCues(parsed);
            } catch (err) {
                console.warn('Failed to load VTT', err);
            }
        };
        loadVtt();
        return () => { cancelled = true; };
    }, [fullCaptionUrl]);

    // Load cognitive content for cognitive users
    useEffect(() => {
        if (userDisabilityType === 'cognitive' && lesson?.cognitiveMode) {
            // Set cognitive content from lesson data directly
            setCognitiveContent({
                summary: lesson.cognitiveMode.simplifiedSummary,
                keyPoints: lesson.cognitiveMode.keyPoints,
                simplifiedSubtitlesUrl: lesson.cognitiveMode.simplifiedSubtitlesUrl
            });
        } else {
            setCognitiveContent(null);
        }
    }, [userDisabilityType, lesson]);

    // Set subtitle URL based on user type
    useEffect(() => {
        // For cognitive users with simplified subtitles, use those
        if (userDisabilityType === 'cognitive' && lesson?.cognitiveMode?.simplifiedSubtitlesUrl) {
            const simplifiedUrl = `${SERVER_BASE_URL}${lesson.cognitiveMode.simplifiedSubtitlesUrl}`;
            setSubtitleUrlForMode(simplifiedUrl);
        } else {
            // Otherwise use the regular caption URL
            setSubtitleUrlForMode(fullCaptionUrl);
        }
    }, [fullCaptionUrl, userDisabilityType, lesson]);

    if (!lesson || !fullVideoUrl) {
        return <p>No video available for this lesson.</p>;
    }

    return (
        // The 'key' forces the video element to re-render when the lesson changes
        <div>
            {/* Show cognitive mode indicator for cognitive users */}
            {userDisabilityType === 'cognitive' && lesson?.cognitiveMode && (
                <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#ddd6fe', 
                    borderRadius: '8px', 
                    marginBottom: '12px',
                    border: '2px solid #8b5cf6'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px' }}>🧠</span>
                        <strong style={{ color: '#5b21b6' }}>Simplified Video Playing</strong>
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b21a8' }}>
                        ✓ This is a specially processed video slowed to 75% speed<br/>
                        ✓ Simplified subtitles are enabled<br/>
                        ✓ Optimized for easier comprehension
                    </div>
                </div>
            )}

            <video ref={videoRef} key={`${fullVideoUrl}-${subtitleUrlForMode || 'no-sub'}`} width="100%" controls style={{ borderRadius: '8px' }}>
                <source src={fullVideoUrl} type="video/mp4" />

                {/* Subtitle track for selected mode */}
                {subtitleUrlForMode && (
                    <track
                        src={subtitleUrlForMode}
                        kind="subtitles"
                        srcLang={lesson?.language || 'en'}
                        label={mode === 'cognitive' ? 'Easy Subtitles' : (lesson?.language === 'mr' ? 'Marathi' : 'English')}
                        default
                    />
                )}

                Your browser does not support the video tag.
            </video>

            {/* Caption controls - Generate/Regenerate captions */}
            <div style={{ marginTop: 12, display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Always show the button - users can generate or regenerate captions */}
                <button 
                    disabled={loading || !lesson || (!lesson.videoUrl && !lesson.videoS3Key)} 
                    onClick={async () => {
                        try {
                            // Validation checks
                            if (!lesson) {
                                alert('No lesson data available');
                                return;
                            }
                            if (!courseId) {
                                alert('No course ID available');
                                return;
                            }
                            if (!lesson._id) {
                                alert('No lesson ID available');
                                return;
                            }
                            if (!lesson.videoUrl && !lesson.videoS3Key) {
                                alert('This lesson has no video file. Please upload a video first.');
                                return;
                            }

                            console.log('🎯 Starting caption generation for:', {
                                courseId,
                                lessonId: lesson._id,
                                lessonTitle: lesson.title,
                                hasVideoUrl: !!lesson.videoUrl,
                                hasVideoS3Key: !!lesson.videoS3Key
                            });

                            setLoading(true);
                            const payload = {};
                            if (lesson?.language) payload.language = lesson.language;
                            
                            const resp = await api.post(
                                `/courses/${courseId}/lessons/${lesson._id}/generate-subtitles`,
                                payload,
                                {
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    timeout: 60000 // 60 second timeout
                                }
                            );
                            
                            console.log('✅ Caption generation response:', resp.data);
                            
                            if (resp.data && resp.data.captionUrl) {
                                const updatedLesson = { ...lesson, captionUrl: resp.data.captionUrl };
                                if (resp.data.captionS3Key) {
                                    updatedLesson.captionS3Key = resp.data.captionS3Key;
                                }
                                onUpdateLesson && onUpdateLesson(updatedLesson);
                                // Reload the page to fetch new signed URL for captions
                                alert('✅ Captions generated successfully! Refreshing to load new captions...');
                                window.location.reload();
                            } else if (resp.data && resp.data.status === 'queued') {
                                alert('Caption generation queued. It may take a few minutes.');
                            } else if (resp.data && resp.data.status === 'done' && resp.data.subtitlesUrl) {
                                const updatedLesson = { ...lesson, captionUrl: resp.data.subtitlesUrl };
                                onUpdateLesson && onUpdateLesson(updatedLesson);
                                alert('✅ Captions ready! Refreshing to load new captions...');
                                window.location.reload();
                            } else {
                                console.warn('⚠️ Unexpected response format:', resp.data);
                                alert('Caption generation started but response was unexpected. Check server logs.');
                            }
                        } catch (err) {
                            console.error('❌ Failed to generate captions:', err);
                            console.error('Error details:', {
                                message: err.message,
                                response: err.response?.data,
                                status: err.response?.status,
                                statusText: err.response?.statusText
                            });
                            
                            // Show more specific error message
                            let errorMsg = 'Failed to generate captions.\n\n';
                            if (err.response?.status === 400) {
                                if (err.response?.data?.msg) {
                                    errorMsg += err.response.data.msg;
                                    if (err.response.data.suggestion) {
                                        errorMsg += '\n\n' + err.response.data.suggestion;
                                    }
                                    if (err.response.data.videoPath) {
                                        errorMsg += `\n\nVideo path: ${err.response.data.videoPath}`;
                                    }
                                } else {
                                    errorMsg += 'Bad request - lesson or video data may be invalid.';
                                }
                            } else if (err.response?.status === 404) {
                                errorMsg += 'Course or lesson not found. Please refresh and try again.';
                            } else if (err.response?.status >= 500) {
                                errorMsg += 'Server error. Please check server logs and try again.';
                            } else if (err.code === 'ECONNABORTED') {
                                errorMsg += 'Request timed out. Caption generation may take longer for large videos.';
                            } else if (err.response?.data?.msg) {
                                errorMsg += err.response.data.msg;
                                if (err.response.data.suggestion) {
                                    errorMsg += '\n\n' + err.response.data.suggestion;
                                }
                            } else {
                                errorMsg += 'Check server logs and ensure ASSEMBLYAI_API_KEY is set and ffmpeg is installed.';
                            }
                            alert(errorMsg);
                        } finally { 
                            setLoading(false); 
                        }
                    }} 
                    style={{ 
                        padding: '8px 16px', 
                        borderRadius: 6, 
                        background: (!lesson || (!lesson.videoUrl && !lesson.videoS3Key)) ? '#94a3b8' : '#2563EB', 
                        color: '#fff', 
                        border: 'none',
                        cursor: loading || (!lesson || (!lesson.videoUrl && !lesson.videoS3Key)) ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        opacity: (!lesson || (!lesson.videoUrl && !lesson.videoS3Key)) ? 0.6 : 1
                    }}
                >
                    {loading ? '⏳ Generating…' : (cues.length > 0 ? '🔄 Regenerate Captions' : '📝 Generate Captions')}
                </button>
                
                {/* Show transcript toggle button when captions exist */}
                {cues.length > 0 && (
                    <button 
                        onClick={() => setShowTranscript(prev => !prev)}
                        style={{ 
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            background: showTranscript ? '#E5E7EB' : '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}
                    >
                        {showTranscript ? '📖 Hide Transcript' : '📖 Show Transcript'}
                    </button>
                )}
            </div>

            {/* Current Caption Display */}
            {cues.length > 0 && (
                <div 
                    style={{ 
                        position: 'relative',
                        marginTop: 8,
                        minHeight: 60,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <div 
                        style={{ 
                            padding: '12px 20px',
                            background: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            borderRadius: '8px',
                            textAlign: 'center',
                            fontSize: '18px',
                            maxWidth: '90%',
                            visibility: currentCueIndex !== -1 ? 'visible' : 'hidden',
                            transition: 'opacity 0.3s ease',
                            opacity: currentCueIndex !== -1 ? 1 : 0
                        }}
                    >
                        {currentCueIndex !== -1 ? cues[currentCueIndex]?.text : ''}
                    </div>
                </div>
            )}

            {/* Full Transcript Panel (Hidden by Default) */}
            {cues.length > 0 && showTranscript && (
                <div style={{ marginTop: 12, borderTop: '1px dashed #e5e7eb', paddingTop: 12 }}>
                    <div ref={transcriptRef} style={{ maxHeight: 240, overflowY: 'auto' }}>
                        {cues.map((cue, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => { 
                                    if (videoRef.current) { 
                                        videoRef.current.currentTime = cue.start; 
                                        videoRef.current.play(); 
                                    } 
                                }} 
                                style={{ 
                                    padding: 8, 
                                    cursor: 'pointer', 
                                    borderRadius: 4, 
                                    background: currentCueIndex === idx ? '#e5e7eb' : 'transparent',
                                    transition: 'background-color 0.3s ease'
                                }}
                            >
                                <div style={{ fontSize: 12, color: '#6B7280' }}>{new Date(cue.start * 1000).toISOString().substr(11, 8)}</div>
                                <div style={{ whiteSpace: 'pre-wrap' }}>{cue.text}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cognitive Mode Content Display - Show for cognitive users only */}
            {userDisabilityType === 'cognitive' && cognitiveContent && (
                <div style={{ marginTop: 16, borderTop: '1px solid #e6e6e6', paddingTop: 12 }}>
                    <div>
                        <h3 style={{ marginBottom: 6, color: '#5b21b6' }}>📝 Easy Summary</h3>
                        <p style={{ lineHeight: '1.6', fontSize: '16px' }}>{cognitiveContent.summary}</p>

                        <h4 style={{ marginTop: 16, color: '#5b21b6' }}>💡 Key Points</h4>
                        <ul style={{ lineHeight: '1.8', fontSize: '15px' }}>
                            {Array.isArray(cognitiveContent.keyPoints) && cognitiveContent.keyPoints.map((kp, idx) => (
                                <li key={idx}>{kp}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseVideoPlayer;