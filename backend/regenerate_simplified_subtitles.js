require('dotenv').config();
const { generateSimplifiedSubtitles } = require('./services/simplificationService');
const fs = require('fs');

const vttPath = './uploads/subtitles/caption_lessonVideos-1763482562820.vtt';

// Extract transcript from VTT
const vttContent = fs.readFileSync(vttPath, 'utf-8');
const lines = vttContent.split('\n');
const textLines = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '' || 
        line.startsWith('WEBVTT') || 
        line.match(/^\d{2}:\d{2}:\d{2}\.\d{3}/) ||
        line.match(/^(?:\d{2}:)?\d{2}:\d{2}\.\d{3}/) ||
        line.match(/^\d+$/)) {
        continue;
    }
    textLines.push(line);
}

const transcript = textLines.join(' ').trim();
console.log('📄 Transcript length:', transcript.length, 'characters');

generateSimplifiedSubtitles(transcript, vttPath)
    .then(url => {
        console.log('\n✅ SUCCESS! Simplified subtitle URL:', url);
        console.log('🎯 Timestamps adjusted for 0.75x speed video');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ FAILED:', err.message);
        console.error(err.stack);
        process.exit(1);
    });
