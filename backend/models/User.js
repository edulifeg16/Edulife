const mongoose = require('mongoose');

const CourseProgressSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    status: { type: String, enum: ['ongoing', 'incomplete', 'complete'], default: 'ongoing' },
    completedLessons: [{ type: mongoose.Schema.Types.ObjectId }],
    progressPercentage: { type: Number, default: 0 }
});

const QuizAttemptSchema = new mongoose.Schema({
    // V-- THIS IS THE LINE TO FIX --V
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }, // Add ref: 'Quiz'
    score: Number,
    totalQuestions: Number,
    attemptedOn: { type: Date, default: Date.now },
    viewedByAdmin: { type: Boolean, default: false }
});

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    standard: { type: Number, required: true, min: 7, max: 10 },
    disabilityType: {
        type: String,
        required: true,
        enum: ['visual', 'hearing', 'cognitive', 'mobility']
    },
    role: {
        type: String,
        enum: ['student', 'admin'],
        default: 'student'
    },
    courseProgress: [CourseProgressSchema],
    quizHistory: [QuizAttemptSchema]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);