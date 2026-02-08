const Quiz = require('../models/Quiz');
const Course = require('../models/Course');
const User = require('../models/User');

exports.createQuiz = async (req, res) => {
    try {
        const newQuiz = new Quiz(req.body);
        const quiz = await newQuiz.save();
        res.status(201).json(quiz);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.find().populate('courseId', 'subject standard');
        res.json(quizzes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getQuizById = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id).select('-questions.correctOptionIndex');
        if (!quiz) {
            return res.status(404).json({ msg: 'Quiz not found' });
        }
        res.json(quiz);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.submitQuiz = async (req, res) => {
    const { quizId, userId, answers } = req.body;
    try {
        const quiz = await Quiz.findById(quizId);
        const user = await User.findById(userId);

        if (!quiz || !user) {
            return res.status(404).json({ msg: 'Quiz or User not found' });
        }

        let score = 0;
        quiz.questions.forEach((question, index) => {
            if (question.correctOptionIndex === answers[index]) {
                score++;
            }
        });

        user.quizHistory.push({
            quizId: quizId,
            score: score,
            totalQuestions: quiz.questions.length,
            viewedByAdmin: false
        });
        await user.save();

        res.json({
            msg: 'Quiz submitted successfully!',
            score: score,
            totalQuestions: quiz.questions.length
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.deleteQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(404).json({ msg: 'Quiz not found' });
        }

        await Quiz.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Quiz deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};