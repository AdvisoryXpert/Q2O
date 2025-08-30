const express = require('express');

module.exports = (db) => {
    const router = express.Router();

    // GET all activity logs or filter by user_id, event_type, date range
    router.get('/logs', (req, res) => {
        const { user_id, event_type, start_date, end_date } = req.query;
        let query = 'SELECT * FROM ro_cpq.user_activity_logs WHERE 1=1';
        const params = [];

        if (user_id) {
            query += ' AND user_id = ?';
            params.push(user_id);
        }
        if (event_type) {
            query += ' AND event_type = ?';
            params.push(event_type);
        }
        if (start_date) {
            query += ' AND timestamp >= ?';
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND timestamp <= ?';
            params.push(end_date);
        }

        query += ' ORDER BY timestamp DESC';

        db.query(query, params, (err, results) => {
            if (err) {
                console.error('DB Error fetching activity logs:', err);
                return res.status(500).json({ error: 'Database error fetching logs' });
            }
            res.json(results);
        });
    });

    // GET summary of activity (e.g., total logins, unique users)
    router.get('/summary', (req, res) => {
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_events,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT ip_address) as unique_ips,
                SUM(CASE WHEN event_type = 'login' THEN 1 ELSE 0 END) as total_logins
            FROM ro_cpq.user_activity_logs;
        `;

        db.query(summaryQuery, (err, results) => {
            if (err) {
                console.error('DB Error fetching activity summary:', err);
                return res.status(500).json({ error: 'Database error fetching summary' });
            }
            res.json(results[0]);
        });
    });

    return router;
};