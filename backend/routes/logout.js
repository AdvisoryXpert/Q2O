// routes/logout.js
const express = require('express');
const router = express.Router();

module.exports = () => {
    router.post('/', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Could not log out, please try again.' });
            }
            res.clearCookie('connect.sid'); // Use the name of your session cookie
            return res.json({ success: true, message: 'Logged out successfully' });
        });
    });
    return router;
};