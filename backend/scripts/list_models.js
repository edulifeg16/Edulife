// Small helper to list Generative Language models using the API key in .env
require('dotenv').config();
const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('No GEMINI_API_KEY found in .env');
  process.exit(1);
}
const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(key)}`;
(async () => {
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    console.log('HTTP', res.status, res.statusText);
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(text);
    }
  } catch (err) {
    console.error('Request failed:', err && err.message ? err.message : err);
  }
})();

