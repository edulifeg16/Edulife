const User = require('../models/User');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');

// @desc    Get platform statistics for the admin dashboard
// @route   GET /api/admin/stats
exports.getStats = async (req, res) => {
    try {
        // --- Top Row Cards ---
        const totalUsers = await User.countDocuments({ role: 'student' }); // Count only students
        const totalCourses = await Course.countDocuments();
        const totalQuizzes = await Quiz.countDocuments();
        
        // --- Chart 1: Student Distribution by Disability ---
        const studentDistribution = await User.aggregate([
            { $match: { role: 'student' } }, // Only include students
            { $group: { _id: "$disabilityType", count: { $sum: 1 } } },
            { $project: { _id: 0, name: "$_id", value: "$count" } } // Format for the chart
        ]);

        // --- Chart 2: Enrollments by Standard/Class ---
        const enrollmentsByStandard = await User.aggregate([
            { $match: { role: 'student' } }, // Only include students
            { $group: { _id: "$standard", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }, // Sort by class (7, 8, 9, 10)
            { $project: { _id: 0, name: { $concat: [ { $toString: "$_id" }, "th" ] }, value: "$count" } }
        ]);

        res.json({
            totalUsers,
            totalCourses,
            totalQuizzes,
            studentDistribution,
            enrollmentsByStandard
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all student users
// @route   GET /api/admin/users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'student' }).select('-password'); // Find students and exclude their passwords
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete a user by ID
// @route   DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        await user.deleteOne();
        res.json({ msg: 'User removed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Admin: view a single quiz attempt (one-time). Marks the attempt as viewed so it cannot be retrieved again.
// @route   GET /api/admin/quiz-attempt/:userId/:attemptId
exports.viewQuizAttemptOnce = async (req, res) => {
    try {
        const { userId, attemptId } = req.params;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const attempt = user.quizHistory.id(attemptId);
        if (!attempt) return res.status(404).json({ msg: 'Attempt not found' });

        if (attempt.viewedByAdmin) {
            return res.status(403).json({ msg: 'Attempt already viewed' });
        }

        // Mark as viewed and save
        attempt.viewedByAdmin = true;
        await user.save();

        res.json({ attempt });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};