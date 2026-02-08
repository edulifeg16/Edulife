const express = require('express');
const app = express();

// Test API call
async function testAPI() {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('http://localhost:5000/api/courses/search/lesson/crop%20production%20and%20management');
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Response data:', JSON.stringify(result, null, 2));
        } else {
            const errorText = await response.text();
            console.log('Error response:', errorText);
        }
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testAPI();