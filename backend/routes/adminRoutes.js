const express = require('express');
const router = express.Router();
const { getStats, getAllUsers, deleteUser } = require('../controllers/adminController');

const { viewQuizAttemptOnce } = require('../controllers/adminController');

// Add middleware later to protect this route
router.get('/stats', getStats);
router.get('/users', getAllUsers);       
router.delete('/users/:id', deleteUser);
router.get('/quiz-attempt/:userId/:attemptId', viewQuizAttemptOnce);

module.exports = router;