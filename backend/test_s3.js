/**
 * S3 Connection Test Script
 * 
 * Run this script to verify your S3 configuration is working correctly.
 * 
 * Usage: node test_s3.js
 */

require('dotenv').config();
const s3Service = require('./Aws');

async function testS3Connection() {
    console.log('\n========================================');
    console.log('EduLife S3 Connection Test');
    console.log('========================================\n');

    // Check configuration
    console.log('📋 Configuration Check:');
    console.log(`   Region: ${s3Service.config.region}`);
    console.log(`   Bucket: ${s3Service.config.bucketName}`);
    console.log(`   Configured: ${s3Service.config.isConfigured ? '✅ Yes' : '❌ No'}`);
    console.log('');

    if (!s3Service.config.isConfigured) {
        console.log('❌ S3 is not configured. Please set AWS credentials in .env file.');
        console.log('\nRequired environment variables:');
        console.log('   AWS_ACCESS_KEY_ID=your_access_key');
        console.log('   AWS_SECRET_ACCESS_KEY=your_secret_key');
        console.log('   AWS_REGION=ap-south-1');
        console.log('   AWS_BUCKET_NAME=your-bucket-name');
        return;
    }

    try {
        // Test 1: List objects in bucket
        console.log('🧪 Test 1: List objects in bucket...');
        const objects = await s3Service.listObjects('', 5);
        console.log(`   ✅ Success! Found ${objects.length} objects in bucket.`);
        if (objects.length > 0) {
            console.log('   Sample objects:');
            objects.forEach(obj => {
                console.log(`      - ${obj.key} (${(obj.size / 1024).toFixed(2)} KB)`);
            });
        }
        console.log('');

        // Test 2: Upload a test file
        console.log('🧪 Test 2: Upload test file...');
        const testContent = Buffer.from('EduLife S3 Test - ' + new Date().toISOString());
        const testKey = 'test/connection-test.txt';
        await s3Service.uploadFile(testContent, testKey, 'text/plain');
        console.log(`   ✅ Successfully uploaded test file to: ${testKey}`);
        console.log('');

        // Test 3: Generate signed URL
        console.log('🧪 Test 3: Generate signed download URL...');
        const signedUrl = await s3Service.getSignedDownloadUrl(testKey, 300); // 5 min expiry
        console.log(`   ✅ Signed URL generated (expires in 5 min)`);
        console.log(`   URL preview: ${signedUrl.substring(0, 80)}...`);
        console.log('');

        // Test 4: Check if object exists
        console.log('🧪 Test 4: Check object existence...');
        const exists = await s3Service.objectExists(testKey);
        console.log(`   ✅ Object exists check: ${exists ? 'Yes' : 'No'}`);
        console.log('');

        // Test 5: Delete test file
        console.log('🧪 Test 5: Delete test file...');
        await s3Service.deleteObject(testKey);
        console.log(`   ✅ Test file deleted successfully`);
        console.log('');

        // Final summary
        console.log('========================================');
        console.log('✅ All S3 tests passed successfully!');
        console.log('   Your S3 configuration is working correctly.');
        console.log('========================================\n');

    } catch (error) {
        console.log('');
        console.log('❌ S3 Test Failed:');
        console.log(`   Error: ${error.message}`);
        console.log('');
        console.log('Please check:');
        console.log('   1. AWS credentials are correct');
        console.log('   2. Bucket name matches your S3 bucket');
        console.log('   3. IAM user has proper permissions');
        console.log('   4. Network connectivity to AWS');
        console.log('');
    }
}

testS3Connection();
