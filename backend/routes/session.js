const express = require('express');
const router = express.Router();

router.get('/session-data', (req, res) => {
    if (req.session.user_id) {
        res.json({
            user_id: req.session.user_id,
            userMobile: req.session.userMobile,
            userRole: req.session.userRole,
            userName: req.session.userName
        });
    } else {
        res.status(401).json({ message: 'No active session or user data found.' });
    }
});

module.exports = router;
