const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register a new user (STUDENTS ONLY)
exports.register = async (req, res) => {
    const { name, email, password, standard, disabilityType } = req.body;
    // Prevent anyone from registering as an admin
    if (email === 'admin@email.com') {
        return res.status(400).json({ msg: 'Cannot register with this email address.' });
    }
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }
        user = new User({ name, email, password, standard, disabilityType }); // role defaults to 'student'

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = { user: { id: user.id, role: user.role } };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// ... (keep the register function as is) ...

// @desc    Authenticate user & get token (Login for Admin and Students)
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        // --- ADMIN LOGIN LOGIC ---
        // Ensure this block is exactly as follows
        if (email === 'admin@email.com') {
            if (password === '12345678') {
                // Create a payload for the admin user
                const adminPayload = {
                    id: 'admin_id_placeholder', // Static ID is fine for this case
                    name: 'Admin',
                    email: 'admin@email.com',
                    role: 'admin',
                    disabilityType: null // Admin does not have a disability type
                };

                const tokenPayload = { user: { id: adminPayload.id, role: 'admin' } };

                // The 'return' is crucial to stop execution here
                return jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
                    if (err) throw err;
                    return res.json({ token, user: adminPayload });
                });
            } else {
                // This is the line that sends the error message
                return res.status(400).json({ msg: 'Invalid Admin Credentials' });
            }
        }

        // --- STUDENT LOGIN LOGIC ---
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        
        const userPayload = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            disabilityType: user.disabilityType,
            standard: user.standard
        };

        const tokenPayload = { user: { id: user.id, role: user.role } };
        
        jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: userPayload });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};