// routes/logout.js
const express = require('express');
const router = express.Router();

module.exports = () => {
    router.post('/', (req, res) => {
        // With JWTs, logout is primarily handled client-side by discarding the token.
        // No server-side session destruction is needed.
        return res.json({ success: true, message: 'Logged out successfully' });
    });
    return router;
};