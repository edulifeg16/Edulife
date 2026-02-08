const express = require('express');
const router = express.Router();
const { getQuizHistory, getUserById, startCourseForUser, completeCourseForUser, updateUserProfile } = require('../controllers/userController');

router.get('/:id/quiz-history', getQuizHistory);
router.get('/:id', getUserById);
router.post('/:id/course-start', startCourseForUser);
router.post('/:id/course-complete', completeCourseForUser);
router.put('/:id', updateUserProfile);

module.exports = router;