require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { extractTranscriptFromVTT } = require('./services/simplificationService');

const vttFilePath = path.join(__dirname, 'uploads', 'subtitles', 'caption_lessonVideos-1763482562820.vtt');

console.log('Reading VTT file:', vttFilePath);
console.log('File exists:', fs.existsSync(vttFilePath));

if (fs.existsSync(vttFilePath)) {
    const content = fs.readFileSync(vttFilePath, 'utf-8');
    console.log('File size:', content.length, 'bytes');
    console.log('First 500 chars:', content.substring(0, 500));
    
    console.log('\n--- Extracting transcript ---');
    const transcript = extractTranscriptFromVTT(vttFilePath);
    console.log('Transcript length:', transcript.length);
    console.log('First 200 chars of transcript:', transcript.substring(0, 200));
    
    // Try to manually generate a simple VTT
    console.log('\n--- Testing VTT generation ---');
    const testVttPath = path.join(__dirname, 'uploads', 'subtitles', 'test_output.vtt');
    const testContent = `WEBVTT

1
00:00:00.000 --> 00:00:05.000
This is a test subtitle.

2
00:00:05.000 --> 00:00:10.000
This is another test subtitle.
`;
    
    fs.writeFileSync(testVttPath, testContent, 'utf-8');
    console.log('Test VTT written to:', testVttPath);
    
    // Verify it was written
    const verifyContent = fs.readFileSync(testVttPath, 'utf-8');
    console.log('Verified test file size:', verifyContent.length, 'bytes');
    console.log('Content matches:', testContent === verifyContent);
}
