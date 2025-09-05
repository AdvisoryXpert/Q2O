const express = require('express');
const router = express.Router();
const db = require('../db');

// Last 6 days quotes (tenant-scoped)
router.get('/quote-status-count', (req, res) => {
  const query = `
    SELECT DATE_FORMAT(date_created, '%b %d') AS quote_created, COUNT(*) AS orders
    FROM ro_cpq.quotation
    WHERE tenant_id = ?
    GROUP BY DATE_FORMAT(date_created, '%b %d'), DATE(date_created)
    ORDER BY DATE(date_created) DESC
    LIMIT 6;
  `;

  db.query(query, [req.tenant_id], (err, results) => {
    if (err) {
      console.error('Error fetching quote status count:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results.reverse());
  });
});

router.get('/monthly-conversion', (req, res) => {
  const sql = `
    SELECT 
      MONTH(date_created) AS mnum,
      MONTHNAME(date_created) AS month, 
      SUM(CASE WHEN status = 'Finalized' THEN 1 ELSE 0 END) AS converted,
      COUNT(*) AS total
    FROM ro_cpq.quotation
    WHERE tenant_id = ? AND YEAR(date_created) = YEAR(CURDATE())
    GROUP BY MONTH(date_created), MONTHNAME(date_created)
    ORDER BY MONTH(date_created);
  `;

  db.query(sql, [req.tenant_id], (err, results) => {
    if (err) {
      console.error("Error fetching conversion data:", err);
      return res.status(500).json({ error: "Failed to fetch conversion data" });
    }
    const formatted = results.map(r => ({
      month: r.month,
      conversion: r.total ? Math.round((r.converted / r.total) * 100) : 0
    }));
    res.json(formatted);
  });
});

module.exports = router;
