/**
 * Test Script for Cognitive Mode Implementation
 * 
 * This script tests the simplification service functions independently
 * Run with: node scripts/test_cognitive_mode.js
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const {
    extractTranscriptFromVTT,
    generateSimplifiedSummary,
    generateKeyBulletPoints,
    generateSimplifiedSubtitles,
    processVideoForCognitiveMode
} = require('../services/simplificationService');

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function separator() {
    console.log('\n' + '='.repeat(70) + '\n');
}

// Test sample transcript
const sampleTranscript = `
Photosynthesis is the process by which green plants and some other organisms 
use sunlight to synthesize foods with the help of chlorophyll pigments. 
During photosynthesis in green plants, light energy is captured and used to 
convert water, carbon dioxide, and minerals into oxygen and energy-rich organic 
compounds. The process occurs in the chloroplasts, specifically using chlorophyll, 
the green pigment involved in photosynthesis. Plants take in carbon dioxide from 
the air through small pores called stomata, and water from the soil through their 
roots. When sunlight hits the chlorophyll in the leaves, it triggers a chemical 
reaction that combines carbon dioxide and water to produce glucose, which is a 
type of sugar that plants use for energy and growth. As a byproduct of this process, 
oxygen is released into the atmosphere, which is essential for the survival of most 
living organisms on Earth.
`;

async function test1_ExtractTranscript() {
    log('TEST 1: Extract Transcript from VTT', 'cyan');
    separator();
    
    try {
        // Check if any VTT files exist
        const subtitlesDir = path.join(__dirname, '..', 'uploads', 'subtitles');
        
        if (!fs.existsSync(subtitlesDir)) {
            log('⚠️  No subtitles directory found', 'yellow');
            log('   Creating test VTT file...', 'yellow');
            
            // Create test VTT file
            fs.mkdirSync(subtitlesDir, { recursive: true });
            const testVttContent = `WEBVTT

1
00:00:00.000 --> 00:00:05.000
Hello and welcome to this lesson about photosynthesis.

2
00:00:05.000 --> 00:00:10.000
Today we will learn how plants make their own food.

3
00:00:10.000 --> 00:00:15.000
This process uses sunlight, water, and carbon dioxide.`;

            const testVttPath = path.join(subtitlesDir, 'test_sample.vtt');
            fs.writeFileSync(testVttPath, testVttContent);
            
            const transcript = extractTranscriptFromVTT(testVttPath);
            log('✅ Test VTT file created and transcript extracted', 'green');
            log(`\nExtracted text: "${transcript}"`, 'blue');
            
        } else {
            // Use existing VTT file
            const vttFiles = fs.readdirSync(subtitlesDir).filter(f => f.endsWith('.vtt'));
            
            if (vttFiles.length === 0) {
                log('⚠️  No VTT files found in subtitles directory', 'yellow');
                return;
            }
            
            const testFile = path.join(subtitlesDir, vttFiles[0]);
            log(`Using file: ${vttFiles[0]}`, 'blue');
            
            const transcript = extractTranscriptFromVTT(testFile);
            log('✅ Transcript extracted successfully', 'green');
            log(`\nLength: ${transcript.length} characters`, 'blue');
            log(`\nFirst 200 chars: "${transcript.substring(0, 200)}..."`, 'blue');
        }
        
    } catch (error) {
        log('❌ Test failed:', 'red');
        console.error(error);
    }
}

async function test2_GenerateSimplifiedSummary() {
    log('TEST 2: Generate Simplified Summary', 'cyan');
    separator();
    
    try {
        log('Using sample transcript about photosynthesis...', 'blue');
        log('\nGenerating simplified summary (this may take 10-15 seconds)...', 'yellow');
        
        const summary = await generateSimplifiedSummary(sampleTranscript);
        
        log('✅ Summary generated successfully', 'green');
        log(`\nLength: ${summary.length} characters`, 'blue');
        log(`\nSimplified Summary:\n${summary}`, 'blue');
        
    } catch (error) {
        log('❌ Test failed:', 'red');
        console.error(error);
        
        if (error.message.includes('API')) {
            log('\n⚠️  Check your GEMINI_API_KEY in .env file', 'yellow');
        }
    }
}

async function test3_GenerateKeyPoints() {
    log('TEST 3: Generate Key Bullet Points', 'cyan');
    separator();
    
    try {
        log('Using sample transcript about photosynthesis...', 'blue');
        log('\nGenerating key points (this may take 10-15 seconds)...', 'yellow');
        
        const keyPoints = await generateKeyBulletPoints(sampleTranscript);
        
        log('✅ Key points generated successfully', 'green');
        log(`\nTotal points: ${keyPoints.length}`, 'blue');
        log('\nKey Points:', 'blue');
        keyPoints.forEach((point, index) => {
            log(`  ${index + 1}. ${point}`, 'blue');
        });
        
    } catch (error) {
        log('❌ Test failed:', 'red');
        console.error(error);
    }
}

async function test4_GenerateSimplifiedSubtitles() {
    log('TEST 4: Generate Simplified Subtitles', 'cyan');
    separator();
    
    try {
        const subtitlesDir = path.join(__dirname, '..', 'uploads', 'subtitles');
        
        // Find a VTT file to use
        if (!fs.existsSync(subtitlesDir)) {
            log('⚠️  No subtitles directory found. Skipping this test.', 'yellow');
            return;
        }
        
        const vttFiles = fs.readdirSync(subtitlesDir)
            .filter(f => f.endsWith('.vtt') && !f.includes('simplified'));
        
        if (vttFiles.length === 0) {
            log('⚠️  No VTT files found. Skipping this test.', 'yellow');
            return;
        }
        
        const testVttPath = path.join(subtitlesDir, vttFiles[0]);
        log(`Using file: ${vttFiles[0]}`, 'blue');
        log('\nGenerating simplified subtitles (this may take 15-20 seconds)...', 'yellow');
        
        const simplifiedUrl = await generateSimplifiedSubtitles(sampleTranscript, testVttPath);
        
        log('✅ Simplified subtitles generated successfully', 'green');
        log(`\nSaved to: ${simplifiedUrl}`, 'blue');
        
        // Show first few lines of the simplified file
        const simplifiedPath = path.join(__dirname, '..', simplifiedUrl.replace('/uploads/', 'uploads/'));
        if (fs.existsSync(simplifiedPath)) {
            const content = fs.readFileSync(simplifiedPath, 'utf-8');
            const lines = content.split('\n').slice(0, 15);
            log('\nFirst few lines of simplified VTT:', 'blue');
            log(lines.join('\n'), 'blue');
        }
        
    } catch (error) {
        log('❌ Test failed:', 'red');
        console.error(error);
    }
}

async function test5_FullWorkflow() {
    log('TEST 5: Full Workflow (processVideoForCognitiveMode)', 'cyan');
    separator();
    
    try {
        const subtitlesDir = path.join(__dirname, '..', 'uploads', 'subtitles');
        
        if (!fs.existsSync(subtitlesDir)) {
            log('⚠️  No subtitles directory found. Skipping this test.', 'yellow');
            return;
        }
        
        const vttFiles = fs.readdirSync(subtitlesDir)
            .filter(f => f.endsWith('.vtt') && !f.includes('simplified'));
        
        if (vttFiles.length === 0) {
            log('⚠️  No VTT files found. Skipping this test.', 'yellow');
            return;
        }
        
        const testVttUrl = `/uploads/subtitles/${vttFiles[0]}`;
        log(`Testing with: ${testVttUrl}`, 'blue');
        log('\nRunning complete workflow (this may take 30-45 seconds)...', 'yellow');
        
        const result = await processVideoForCognitiveMode(testVttUrl);
        
        log('✅ Full workflow completed successfully', 'green');
        log('\nResults:', 'blue');
        log(`  - Transcript length: ${result.transcript.length} characters`, 'blue');
        log(`  - Summary length: ${result.simplifiedSummary.length} characters`, 'blue');
        log(`  - Key points: ${result.keyPoints.length}`, 'blue');
        log(`  - Simplified subtitles: ${result.simplifiedSubtitlesUrl}`, 'blue');
        log(`  - Processed at: ${result.processedAt}`, 'blue');
        
        log('\nSimplified Summary:', 'cyan');
        log(result.simplifiedSummary, 'blue');
        
        log('\nKey Points:', 'cyan');
        result.keyPoints.forEach((point, index) => {
            log(`  ${index + 1}. ${point}`, 'blue');
        });
        
    } catch (error) {
        log('❌ Test failed:', 'red');
        console.error(error);
    }
}

// Main test runner
async function runAllTests() {
    log('\n🧪 COGNITIVE MODE IMPLEMENTATION - TEST SUITE', 'cyan');
    log('='.repeat(70), 'cyan');
    
    // Check environment variables
    if (!process.env.GEMINI_API_KEY) {
        log('\n❌ ERROR: GEMINI_API_KEY not found in .env file', 'red');
        log('Please add your Gemini API key to the .env file', 'yellow');
        return;
    }
    
    log('\n✅ Environment variables loaded', 'green');
    log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY.substring(0, 10)}...`, 'blue');
    
    separator();
    
    try {
        // Run tests sequentially
        await test1_ExtractTranscript();
        separator();
        
        await test2_GenerateSimplifiedSummary();
        separator();
        
        await test3_GenerateKeyPoints();
        separator();
        
        await test4_GenerateSimplifiedSubtitles();
        separator();
        
        await test5_FullWorkflow();
        separator();
        
        log('✅ ALL TESTS COMPLETED', 'green');
        
    } catch (error) {
        log('❌ TEST SUITE FAILED', 'red');
        console.error(error);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    test1_ExtractTranscript,
    test2_GenerateSimplifiedSummary,
    test3_GenerateKeyPoints,
    test4_GenerateSimplifiedSubtitles,
    test5_FullWorkflow,
    runAllTests
};
