// S3 CORS Configuration Script
const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");
require('dotenv').config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const corsConfiguration = {
    CORSRules: [
        {
            ID: 'EdulifeFrontendCORS',
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'HEAD'],
            AllowedOrigins: [
                'http://localhost:3000',
                'http://localhost:3001', 
                'http://127.0.0.1:3000'
            ],
            ExposeHeaders: [
                'Content-Length',
                'Content-Type',
                'Content-Range',
                'Accept-Ranges'
            ],
            MaxAgeSeconds: 3000
        }
    ]
};

async function configureCORS() {
    try {
        console.log('🔧 Configuring CORS for S3 bucket...');
        
        const command = new PutBucketCorsCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            CORSConfiguration: corsConfiguration
        });
        
        await s3Client.send(command);
        console.log('✅ CORS configuration applied successfully!');
        console.log('Frontend origins allowed:', corsConfiguration.CORSRules[0].AllowedOrigins);
        
    } catch (error) {
        console.error('❌ Failed to configure CORS:', error.message);
        if (error.name === 'AccessDenied') {
            console.error('💡 Make sure your AWS credentials have s3:PutBucketCors permission');
        }
    }
}

configureCORS();