const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  // GET activity logs (tenant-scoped + optional filters)
  router.get('/logs', (req, res) => {
    const { user_id, event_type, start_date, end_date } = req.query;
    let query = 'SELECT a.* FROM ro_cpq.user_activity_logs a JOIN ro_cpq.users u ON a.user_id = u.user_id WHERE u.tenant_id = ?';
    const params = [req.tenant_id];

    if (user_id) { query += ' AND a.user_id = ?'; params.push(user_id); }
    if (event_type) { query += ' AND a.event_type = ?'; params.push(event_type); }
    if (start_date) { query += ' AND a.timestamp >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND a.timestamp <= ?'; params.push(end_date); }

    query += ' ORDER BY a.timestamp DESC';

    db.query(query, params, (err, results) => {
      if (err) {
        console.error('DB Error fetching activity logs:', err);
        return res.status(500).json({ error: 'Database error fetching logs' });
      }
      res.json(results);
    });
  });

  // GET summary (tenant-scoped)
  router.get('/summary', (req, res) => {
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT a.user_id) as unique_users,
        COUNT(DISTINCT a.ip_address) as unique_ips,
        SUM(CASE WHEN a.event_type = 'login' THEN 1 ELSE 0 END) as total_logins
      FROM ro_cpq.user_activity_logs a
      JOIN ro_cpq.users u ON a.user_id = u.user_id
      WHERE u.tenant_id = ?;
    `;

    db.query(summaryQuery, [req.tenant_id], (err, results) => {
      if (err) {
        console.error('DB Error fetching activity summary:', err);
        return res.status(500).json({ error: 'Database error fetching summary' });
      }
      res.json(results[0]);
    });
  });

  return router;
};
