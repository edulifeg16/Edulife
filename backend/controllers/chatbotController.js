const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
// Ensure model name doesn't have 'models/' prefix
const modelName = DEFAULT_MODEL.replace(/^models\//, '');
const model = genAI.getGenerativeModel({ model: modelName });

exports.processQuery = async (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ msg: 'Message is required.' });
    }
    try {
        const prompt = `You are EduLife, a friendly and helpful AI assistant for students from 7th to 10th grade. Explain things simply. Here is the student's question: "${message}"`;

        // Call the model to generate content. SDK shapes vary between versions; handle multiple shapes safely.
        const result = await model.generateContent(prompt);

        // Extract text from various possible response shapes
        let text = '';
        try {
            if (result && result.response) {
                const response = await result.response;
                if (response && typeof response.text === 'function') {
                    text = response.text();
                } else if (response && response.output && Array.isArray(response.output) && response.output[0] && response.output[0].content) {
                    text = response.output[0].content;
                }
            } else if (result && typeof result.text === 'function') {
                text = result.text();
            } else if (result && result.output && Array.isArray(result.output) && result.output[0] && result.output[0].content) {
                text = result.output[0].content;
            } else {
                // Fallback: stringify a portion of the result for debugging
                try {
                    text = JSON.stringify(result).slice(0, 1000);
                } catch (e) {
                    text = String(result).slice(0, 1000);
                }
            }
        } catch (extractErr) {
            console.warn('Failed to extract text from model result:', extractErr && extractErr.message ? extractErr.message : extractErr);
            text = '';
        }

        res.json({ reply: text });
    } catch (err) {
        console.error("Error calling Gemini API:", err && err.message ? err.message : err);
        // Return a generic error message; details are logged server-side.
        res.status(500).json({ error: 'Error processing your request with the AI service.' });
    }
};