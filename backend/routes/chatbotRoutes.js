const express = require('express');
const router = express.Router();
const { processQuery } = require('../controllers/chatbotController');

router.post('/query', processQuery);

module.exports = router;