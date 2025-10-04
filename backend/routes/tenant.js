
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/tenant', (req, res) => {
        const userId = req.user.id;

    if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const query = `
        SELECT t.name, t.logo_url 
        FROM tenants t
        JOIN users u ON t.tenant_id = u.tenant_id
        WHERE u.user_id = ?
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching tenant data:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (results.length > 0) {
            const tenantData = {
                name: results[0].name,
                logo_url: results[0].logo_url ? `${process.env.VITE_API}/${results[0].logo_url.replace(/^\/*/, '')}` : ''
            };
            res.json(tenantData);
        } else {
            res.status(404).json({ message: 'Tenant not found' });
        }
    });
});

module.exports = router;
