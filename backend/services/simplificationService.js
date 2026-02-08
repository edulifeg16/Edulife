const axios = require('axios');
const fs = require('fs');
const path = require('path');
const s3Service = require('../Aws');

// Gemini API configuration (using REST API directly to avoid SDK version issues)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// We'll discover a working model at runtime. Start with a reasonable default
let selectedModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
let selectedApiVersion = 'v1beta';
let cachedModelUrl = `https://generativelanguage.googleapis.com/${selectedApiVersion}/models/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`;

// Helper: List models for v1 and v1beta and pick a usable one
async function listAvailableModels() {
    const endpoints = [
        `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`,
        `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    ];

    for (const url of endpoints) {
        try {
            const res = await axios.get(url, { headers: { 'Content-Type': 'application/json' } });
            if (res && res.data && Array.isArray(res.data.models) && res.data.models.length) {
                return { models: res.data.models, apiUrlBase: url.includes('/v1beta/') ? 'v1beta' : 'v1' };
            }
        } catch (e) {
            // ignore and try next endpoint
        }
    }
    return null;
}

// Ensure a working model URL is cached. Will call ListModels when needed.
async function ensureModelUrl() {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
    if (cachedModelUrl) return cachedModelUrl;

    const list = await listAvailableModels();
    if (list && list.models && list.models.length) {
        // Prefer models with 'gemini' in the name and known endings
        const prefer = list.models.find(m => /gemini/i.test(m.name) && /flash|classic|pro|1\.5|2\.5/.test(m.name));
        const pick = prefer || list.models[0];
        const apiVer = list.apiUrlBase;
        // model name may be full resource like "models/gemini-1.5-flash"
        const modelName = pick.name.replace(/^models\//, '');
        selectedModel = modelName;
        selectedApiVersion = apiVer;
        cachedModelUrl = `https://generativelanguage.googleapis.com/${selectedApiVersion}/models/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`;
        return cachedModelUrl;
    }

    // fallback to previous default
    cachedModelUrl = `https://generativelanguage.googleapis.com/${selectedApiVersion}/models/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`;
    return cachedModelUrl;
}

// Post helper with retries, exponential backoff, and model-fallback on overloads
async function postToModel(payload) {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

    let attempts = 0;
    const maxAttempts = 4;
    let lastError = null;

    while (attempts < maxAttempts) {
        attempts += 1;
        // ensure we have a model url (may return cached value)
        let url;
        try {
            url = await ensureModelUrl();
        } catch (e) {
            lastError = e;
            break;
        }

        try {
            return await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
        } catch (err) {
            lastError = err;
            const status = err?.response?.status;
            const body = err?.response?.data;

            // If model not found, clear cache and rediscover immediately
            if (status === 404 && body && /not found/i.test(JSON.stringify(body))) {
                cachedModelUrl = null;
                // small pause before retrying discovery
                await new Promise(r => setTimeout(r, 200));
                continue;
            }

            // On transient server errors or rate limits, retry with backoff
            if (status === 503 || status === 429 || (status >= 500 && status < 600)) {
                const backoff = Math.min(2000, Math.pow(2, attempts) * 200) + Math.floor(Math.random() * 200);
                await new Promise(r => setTimeout(r, backoff));

                // After a couple of retries, attempt to switch to an alternative model if available
                if (attempts === 2) {
                    try {
                        const list = await listAvailableModels();
                        if (list && Array.isArray(list.models) && list.models.length) {
                            // pick a different gemini model if possible
                            const alt = list.models.find(m => /gemini/i.test(m.name) && !m.name.includes(selectedModel));
                            if (alt) {
                                const modelName = alt.name.replace(/^models\//, '');
                                selectedModel = modelName;
                                selectedApiVersion = list.apiUrlBase;
                                cachedModelUrl = `https://generativelanguage.googleapis.com/${selectedApiVersion}/models/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`;
                            }
                        }
                    } catch (e) {
                        // ignore and continue retries
                    }
                }

                continue; // retry
            }

            // For other errors do not retry
            break;
        }
    }

    // Throw the last error (will be handled by callers). Avoid dumping API key.
    throw lastError || new Error('Failed to call generative API');
}

// Utility: detect service-unavailable / overloaded errors
function isServiceUnavailableError(err) {
    const status = err?.response?.status;
    const bodyStatus = err?.response?.data?.error?.status;
    if (!err) return false;
    if (status === 503 || status === 429) return true;
    if (bodyStatus === 'UNAVAILABLE' || bodyStatus === 'RESOURCE_EXHAUSTED') return true;
    return false;
}

// Simple local fallback summarizer and bullet point generator
const STOPWORDS = new Set(["the","and","is","in","it","of","to","a","an","that","this","with","for","on","as","are","was","were","be","by","or","from","at","which","but","not","have","has","had","they","their","them","we","us","our","you","your","I","he","she","his","her"]);

function simpleSentenceSplit(text) {
    // naive split by punctuation followed by space
    return text
        .replace(/\r/g, ' ')
        .split(/(?<=[\.\?\!])\s+/)
        .map(s => s.trim())
        .filter(Boolean);
}

function simplifyTextVerySimple(text, maxWords=120) {
    const words = text.replace(/\s+/g, ' ').trim().split(' ');
    const selected = words.slice(0, maxWords);
    // Reflow into short sentences (max 12 words)
    const out = [];
    for (let i=0;i<selected.length;) {
        const len = Math.min(12, selected.length - i);
        out.push(selected.slice(i, i+len).join(' ').replace(/\s+/g,' ').trim());
        i += len;
    }
    return out.join('. ') + '.';
}

async function generateSimplifiedSummaryFallback(transcript) {
    // Pick first few sentences and reflow to simple sentences
    const sents = simpleSentenceSplit(transcript);
    let text = '';
    if (sents.length >= 3) {
        text = sents.slice(0, 4).join(' ');
    } else {
        text = transcript;
    }
    return simplifyTextVerySimple(text, 120);
}

async function generateKeyBulletPointsFallback(transcript) {
    const sents = simpleSentenceSplit(transcript);
    // Score sentences by word frequency
    const freq = Object.create(null);
    const tokens = transcript.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean);
    for (const t of tokens) {
        if (STOPWORDS.has(t)) continue;
        freq[t] = (freq[t]||0) + 1;
    }
    const scored = sents.map(s => {
        const words = s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
        let score = 0;
        for (const w of words) if (freq[w]) score += freq[w];
        return { s, score };
    });
    scored.sort((a,b)=>b.score - a.score);
    const top = scored.slice(0,7).map(x=>x.s);
    // Shorten each to <=10 words
    const bullets = top.map(s => s.split(/\s+/).slice(0,10).join(' ').replace(/[^a-zA-Z0-9 ,]/g,'').trim());
    // Ensure they start with a verb-like action if possible (naive)
    return bullets.map(b => b.charAt(0).toUpperCase() + b.slice(1));
}

async function generateSimplifiedSubtitlesFallback(transcript, originalVttPath) {
    console.log('🔄 Using fallback subtitle generation (keeping original dialogue)...');
    
    // Helper function to convert timestamp to milliseconds
    function timestampToMs(timestamp) {
        const parts = timestamp.split(':');
        if (parts.length === 3) {
            // HH:MM:SS.mmm
            const [hours, minutes, seconds] = parts;
            const [sec, ms] = seconds.split('.');
            return (parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(sec)) * 1000 + parseInt(ms);
        } else if (parts.length === 2) {
            // MM:SS.mmm
            const [minutes, seconds] = parts;
            const [sec, ms] = seconds.split('.');
            return (parseInt(minutes) * 60 + parseInt(sec)) * 1000 + parseInt(ms);
        }
        return 0;
    }
    
    // Helper function to convert milliseconds back to timestamp
    function msToTimestamp(ms) {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = ms % 1000;
        
        // Format as HH:MM:SS.mmm if hours > 0, otherwise MM:SS.mmm
        if (hours > 0) {
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
        } else {
            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
        }
    }
    
    // Read original VTT and adjust timestamps while keeping text
    const originalVttContent = fs.readFileSync(originalVttPath, 'utf-8');
    const lines = originalVttContent.split('\n');
    
    let vttContent = 'WEBVTT\n\n';
    let subtitleNumber = 1;
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i].trim();
        
        // Check if this is a timing line
        const timingMatch = line.match(/^((?:\d{2}:)?\d{2}:\d{2}\.\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}\.\d{3})/);
        
        if (timingMatch) {
            const originalStart = timingMatch[1];
            const originalEnd = timingMatch[2];
            
            // Adjust timestamps for 0.75x speed (multiply by 1.33 = 1/0.75)
            const startMs = timestampToMs(originalStart);
            const endMs = timestampToMs(originalEnd);
            const adjustedStartMs = Math.round(startMs * 1.33);
            const adjustedEndMs = Math.round(endMs * 1.33);
            
            // Get the subtitle text (lines after the timing until empty line)
            const textLines = [];
            i++;
            while (i < lines.length && lines[i].trim() !== '') {
                textLines.push(lines[i]);
                i++;
            }
            
            // Only add if there's actual text
            if (textLines.length > 0) {
                vttContent += `${subtitleNumber}\n`;
                vttContent += `${msToTimestamp(adjustedStartMs)} --> ${msToTimestamp(adjustedEndMs)}\n`;
                vttContent += textLines.join('\n') + '\n\n';
                subtitleNumber++;
            }
        }
        
        i++;
    }
    
    console.log('📊 Fallback: Processed', subtitleNumber - 1, 'subtitles');
    console.log('📄 Fallback: Generated VTT content of', vttContent.length, 'bytes');
    
    if (vttContent.length < 50) {
        throw new Error('Generated VTT content is too small');
    }
    
    const originalFileName = path.basename(originalVttPath, '.vtt');
    const simplifiedFileName = `${originalFileName}_simplified.vtt`;
    const subtitlesDir = path.dirname(originalVttPath);
    const simplifiedVttPath = path.join(subtitlesDir, simplifiedFileName);
    
    fs.writeFileSync(simplifiedVttPath, vttContent, 'utf-8');
    console.log('✅ Fallback subtitles saved to:', simplifiedVttPath);
    
    // Verify
    const verifyContent = fs.readFileSync(simplifiedVttPath, 'utf-8');
    console.log('✔️ Fallback verified file size:', verifyContent.length, 'bytes');
    
    return `/uploads/subtitles/${simplifiedFileName}`;
}

/**
 * Simplification Service
 * Generates cognitive-friendly content from video transcripts
 */

/**
 * Extract transcript text from VTT file
 * @param {string} vttFilePath - Path to the VTT caption file
 * @returns {string} - Plain text transcript
 */
function extractTranscriptFromVTT(vttFilePath) {
    try {
        const vttContent = fs.readFileSync(vttFilePath, 'utf-8');
        
        // Remove VTT headers and timestamps
        const lines = vttContent.split('\n');
        const textLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip WEBVTT header, empty lines, and timestamp lines
            if (line === '' || 
                line.startsWith('WEBVTT') || 
                line.match(/^\d{2}:\d{2}:\d{2}\.\d{3}/) ||
                line.match(/^\d+$/)) {
                continue;
            }
            
            textLines.push(line);
        }
        
        return textLines.join(' ').trim();
    } catch (error) {
        console.error('Error extracting transcript from VTT:', error);
        throw new Error('Failed to extract transcript from VTT file');
    }
}

/**
 * Generate simplified summary using Gemini AI
 * @param {string} transcript - Full video transcript
 * @returns {Promise<string>} - Simplified summary in easy language
 */
async function generateSimplifiedSummary(transcript) {
    try {
        const prompt = `You are an educational content simplifier for students with cognitive impairments.

Given the following video transcript, create a VERY SIMPLE summary that:
- Uses only easy, everyday words (5th-grade reading level)
- Uses short sentences (maximum 10-12 words per sentence)
- Avoids complex grammar and technical jargon
- Focuses on the main ideas only
- Is written in a clear, friendly tone

Keep the summary between 100-150 words.

TRANSCRIPT:
${transcript}

SIMPLIFIED SUMMARY:`;

        const response = await postToModel({
            contents: [{ parts: [{ text: prompt }] }]
        });

        const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('No response from AI');
        return text.trim();
        
    } catch (error) {
        if (isServiceUnavailableError(error)) {
            console.warn('AI service unavailable for summary — using local fallback');
            try {
                const fallback = await generateSimplifiedSummaryFallback(transcript);
                return fallback;
            } catch (fbErr) {
                console.error('Fallback summary failed:', fbErr.message || fbErr);
                throw new Error('Failed to generate simplified summary');
            }
        }
        console.error('❌ Summary generation failed:', error.response?.data || error.message);
        throw new Error('Failed to generate simplified summary');
    }
}

/**
 * Generate key bullet points in simple language
 * @param {string} transcript - Full video transcript
 * @returns {Promise<string[]>} - Array of 5-7 simple bullet points
 */
async function generateKeyBulletPoints(transcript) {
    try {
        const prompt = `You are an educational content simplifier for students with cognitive impairments.

Given the following video transcript, create 5-7 KEY BULLET POINTS that:
- Use very simple, everyday words
- Each point is ONE short sentence (maximum 10 words)
- Cover the most important ideas from the video
- Are easy to understand and remember
- Start each point with a simple action word when possible

Format: Return ONLY the bullet points, one per line, starting with a dash (-).

TRANSCRIPT:
${transcript}

KEY POINTS:`;

        const response = await postToModel({ contents: [{ parts: [{ text: prompt }] }] });
        const bulletText = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!bulletText) throw new Error('No response from AI for bullet points');

        const bulletPoints = bulletText
            .split('\n')
            .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().length > 0)
            .map(line => line.replace(/^[-•]\s*/, '').trim())
            .filter(line => line.length > 0)
            .slice(0, 7);

        return bulletPoints;
        
    } catch (error) {
        if (isServiceUnavailableError(error)) {
            console.warn('AI service unavailable for bullet points — using local fallback');
            try {
                const fallback = await generateKeyBulletPointsFallback(transcript);
                return fallback;
            } catch (fbErr) {
                console.error('Fallback bullet points failed:', fbErr.message || fbErr);
                throw new Error('Failed to generate key bullet points');
            }
        }
        console.error('❌ Bullet points generation failed:', error.response?.data || error.message);
        throw new Error('Failed to generate key bullet points');
    }
}

/**
 * Generate simplified subtitles in VTT format
 * @param {string} transcript - Full video transcript
 * @param {string} originalVttPath - Path to original VTT file
 * @returns {Promise<string>} - Path to simplified VTT file
 */
async function generateSimplifiedSubtitles(transcript, originalVttPath, simplifiedVideoPath = null) {
    try {
        console.log('🎬 Generating subtitles FROM simplified video file...');
        
        // If simplified video path not provided, derive it from original VTT path
        if (!simplifiedVideoPath) {
            const originalVideoFileName = path.basename(originalVttPath, '.vtt').replace('caption_', '');
            const videoDir = path.join(path.dirname(originalVttPath), '..', 'videos');
            simplifiedVideoPath = path.join(videoDir, `${originalVideoFileName}_simplified.mp4`);
        }
        
        console.log('📹 Simplified video path:', simplifiedVideoPath);
        
        // Check if simplified video exists
        if (!fs.existsSync(simplifiedVideoPath)) {
            console.warn('⚠️ Simplified video not found, using time-adjusted original subtitles');
            return await generateSimplifiedSubtitlesFallback(transcript, originalVttPath);
        }
        
        // Generate captions from the simplified video using AssemblyAI
        console.log('🎤 Extracting audio and generating captions from simplified video...');
        const { generateCaptions } = require('./captionService');
        
        // Generate captions from simplified video
        // The generateCaptions function now returns an object with localUrl and s3Key
        const captionResult = await generateCaptions(simplifiedVideoPath, null);
        
        // Handle both old (string) and new (object) return format
        let simplifiedCaptionUrl;
        let s3Key = null;
        
        if (typeof captionResult === 'string') {
            // Legacy format - just a URL string
            simplifiedCaptionUrl = captionResult;
        } else {
            // New format - object with localUrl and s3Key
            simplifiedCaptionUrl = captionResult.localUrl;
            s3Key = captionResult.s3Key;
        }
        
        console.log('✅ Captions generated from simplified video:', simplifiedCaptionUrl);
        
        // If using S3, we're done - the file is already uploaded with correct naming
        if (s3Key) {
            console.log('📤 Captions stored in S3:', s3Key);
            // Return an object with both local URL (for backwards compatibility) and S3 key
            return {
                localUrl: simplifiedCaptionUrl,
                s3Key: s3Key,
                isS3: true
            };
        }
        
        // Local storage: rename to include _simplified suffix
        const originalCaptionPath = path.join(__dirname, '..', simplifiedCaptionUrl);
        const originalFileName = path.basename(originalVttPath, '.vtt');
        const simplifiedFileName = `${originalFileName}_simplified.vtt`;
        const simplifiedCaptionPath = path.join(path.dirname(originalCaptionPath), simplifiedFileName);
        
        // If the generated caption is not already named _simplified, rename it
        if (originalCaptionPath !== simplifiedCaptionPath && fs.existsSync(originalCaptionPath)) {
            fs.renameSync(originalCaptionPath, simplifiedCaptionPath);
            console.log('📝 Renamed caption file to:', simplifiedFileName);
        }
        
        // Return public URL path
        return `/uploads/subtitles/${simplifiedFileName}`;
        
    } catch (error) {
        console.error('❌ Error generating subtitles from simplified video:', error.message);
        console.warn('⚠️ Falling back to time-adjusted original subtitles');
        
        try {
            const fallbackUrl = await generateSimplifiedSubtitlesFallback(transcript, originalVttPath);
            console.log('✅ Fallback subtitles generated successfully');
            return fallbackUrl;
        } catch (fbErr) {
            console.error('❌ Fallback subtitles also failed:', fbErr.message || fbErr);
            throw new Error('Failed to generate subtitles for simplified video');
        }
    }
}

/**
 * Main workflow: Process video content and generate all simplified materials
 * @param {string} captionUrl - Public URL of the VTT caption file (e.g., /uploads/subtitles/caption_xyz.vtt)
 * @param {string} simplifiedVideoPath - Optional path to simplified video file for subtitle generation
 * @returns {Promise<Object>} - Object containing all simplified content
 */
async function processVideoForCognitiveMode(captionUrl, simplifiedVideoPath = null) {
    try {
        console.log('Starting cognitive mode processing for:', captionUrl);
        if (simplifiedVideoPath) {
            console.log('Will generate subtitles from simplified video:', simplifiedVideoPath);
        }
        
        // Resolve VTT file path - check temp, uploads, or download from S3
        const vttFileName = path.basename(captionUrl);
        const tempVttPath = path.join(__dirname, '..', 'temp', 'subtitles', vttFileName);
        const uploadsVttPath = path.join(__dirname, '..', 'uploads', 'subtitles', vttFileName);
        
        let actualVttPath;
        if (fs.existsSync(tempVttPath)) {
            actualVttPath = tempVttPath;
        } else if (fs.existsSync(uploadsVttPath)) {
            actualVttPath = uploadsVttPath;
        } else if (s3Service.config.isConfigured) {
            // VTT was deleted locally after S3 upload - download it back
            // captionUrl could be a local URL like /uploads/subtitles/xxx.vtt
            // or an S3 key like subtitles/xxx.vtt
            let s3Key = captionUrl.startsWith('subtitles/') ? captionUrl : null;
            if (!s3Key) {
                // Try to find the S3 key from the filename
                s3Key = `subtitles/${vttFileName}`;
            }
            console.log('📥 VTT not found locally, downloading from S3:', s3Key);
            const tempSubtitlesDir = path.join(__dirname, '..', 'temp', 'subtitles');
            if (!fs.existsSync(tempSubtitlesDir)) {
                fs.mkdirSync(tempSubtitlesDir, { recursive: true });
            }
            await s3Service.downloadToLocal(s3Key, tempVttPath);
            actualVttPath = tempVttPath;
            console.log('✅ VTT downloaded from S3 to:', tempVttPath);
        } else {
            throw new Error(`VTT file not found at temp (${tempVttPath}) or uploads (${uploadsVttPath})`);
        }
        
        // Step 1: Extract transcript from VTT
        console.log('Extracting transcript from VTT...');
        const transcript = extractTranscriptFromVTT(actualVttPath);
        
        if (!transcript || transcript.length < 50) {
            throw new Error('Transcript too short or empty');
        }
        
        console.log(`Transcript extracted: ${transcript.length} characters`);
        
        // Step 2: Generate all simplified content in parallel for efficiency
        console.log('Generating simplified content...');
        const [simplifiedSummary, keyPoints, simplifiedSubtitlesResult] = await Promise.all([
            generateSimplifiedSummary(transcript),
            generateKeyBulletPoints(transcript),
            generateSimplifiedSubtitles(transcript, actualVttPath, simplifiedVideoPath)
        ]);
        
        // Handle both old (string) and new (object) return format for subtitles
        let simplifiedSubtitlesUrl;
        let simplifiedSubtitlesS3Key = null;
        
        if (typeof simplifiedSubtitlesResult === 'string') {
            simplifiedSubtitlesUrl = simplifiedSubtitlesResult;
        } else if (simplifiedSubtitlesResult && typeof simplifiedSubtitlesResult === 'object') {
            simplifiedSubtitlesUrl = simplifiedSubtitlesResult.localUrl;
            simplifiedSubtitlesS3Key = simplifiedSubtitlesResult.s3Key || null;
        }
        
        console.log('Cognitive mode processing completed successfully');
        
        return {
            transcript,
            simplifiedSummary,
            keyPoints,
            simplifiedSubtitlesUrl,
            simplifiedSubtitlesS3Key,
            processedAt: new Date()
        };
        
    } catch (error) {
        console.error('Error in processVideoForCognitiveMode:', error);
        throw error;
    }
}

module.exports = {
    extractTranscriptFromVTT,
    generateSimplifiedSummary,
    generateKeyBulletPoints,
    generateSimplifiedSubtitles,
    processVideoForCognitiveMode
};
