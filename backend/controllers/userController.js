const User = require('../models/User');
const Course = require('../models/Course');

// @desc    Get quiz history for a user
// @route   GET /api/users/:id/quiz-history
exports.getQuizHistory = async (req, res) => {
    try {
        // Populate the quizId inside the quizHistory subdocuments using nested populate
        const user = await User.findById(req.params.id).populate({
            path: 'quizHistory',
            populate: {
                path: 'quizId',
                model: 'Quiz',
                select: 'title'
            }
        });

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json(user.quizHistory);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getUserById = async (req, res) => {
    try {
        // Populate courseProgress.courseId with course title so frontend can display it without extra fetch
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate({
                path: 'courseProgress.courseId',
                model: 'Course',
                select: 'title'
            });
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Mark a course as started for the user (adds courseProgress entry if missing)
// @route   POST /api/users/:id/course-start
// body: { courseId, startedAtLessonId? }
exports.startCourseForUser = async (req, res) => {
    try {
        const { courseId } = req.body;
        if (!courseId) return res.status(400).json({ msg: 'courseId is required' });

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const existing = user.courseProgress.find(cp => String(cp.courseId) === String(courseId));
        if (!existing) {
            user.courseProgress.push({ courseId, status: 'ongoing', completedLessons: [], progressPercentage: 0 });
            await user.save();
        }

        res.json({ msg: 'Course marked as started' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Mark a course as complete for the user
// @route   POST /api/users/:id/course-complete
// body: { courseId }
exports.completeCourseForUser = async (req, res) => {
    try {
        const { courseId } = req.body;
        if (!courseId) return res.status(400).json({ msg: 'courseId is required' });

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const cp = user.courseProgress.find(cp => String(cp.courseId) === String(courseId));
        if (!cp) {
            user.courseProgress.push({ courseId, status: 'complete', completedLessons: [], progressPercentage: 100 });
        } else {
            cp.status = 'complete';
            cp.progressPercentage = 100;
        }
        await user.save();

        res.json({ msg: 'Course marked complete' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Update user profile (name, email, disabilityType)
// @route   PUT /api/users/:id
exports.updateUserProfile = async (req, res) => {
    try {
        const { name, email, disabilityType } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        if (name) user.name = name;
        if (email) user.email = email;
        if (disabilityType) user.disabilityType = disabilityType;

        await user.save();

        // Return updated user without password
        const updated = await User.findById(req.params.id).select('-password');
        res.json(updated);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};