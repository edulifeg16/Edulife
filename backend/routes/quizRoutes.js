const express = require('express');
const router = express.Router();
const { createQuiz, getQuizzes, getQuizById, submitQuiz, deleteQuiz } = require('../controllers/quizController');

// Routes for creating and getting quizzes
router.route('/').post(createQuiz).get(getQuizzes);
router.post('/submit', submitQuiz);
router.get('/:id', getQuizById);
router.delete('/:id', deleteQuiz);

module.exports = router;