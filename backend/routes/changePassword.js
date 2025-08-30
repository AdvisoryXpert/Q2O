const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

router.post('/change-password', async (req, res) => {
    const { mobile, newPassword } = req.body;

    if (!mobile || !newPassword) {
        return res.status(400).json({ error: 'Mobile and newPassword are required' });
    }

    try {
        const hash = await bcrypt.hash(newPassword, 10);
        const query = "UPDATE users SET password_hash = ? WHERE phone = ?";
        
        db.query(query, [hash, mobile], (err, result) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ error: 'Database error' });
            } else if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'No user found with this mobile' });
            } else {
                return res.json({ success: true, message: 'Password updated successfully' });
            }
        });
    } catch (err) {
        console.error("Hashing error:", err);
        return res.status(500).json({ error: 'Hashing error' });
    }
});

module.exports = router;