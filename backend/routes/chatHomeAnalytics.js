const express = require('express');
const router = express.Router();
const db = require('../db'); 


router.get('/quote-status-count', (req, res) => {
	const query = `
		SELECT 
			DATE_FORMAT(date_created, '%b %d') AS quote_created,
			COUNT(*) AS orders
		FROM ro_cpq.quotation		
		GROUP BY quote_created
		ORDER BY quote_created DESC
		LIMIT 6;
	`;

	db.query(query, (err, results) => {
		if (err) {
			console.error('Error fetching quote status count:', err);
			return res.status(500).json({ error: 'Database error' });
		}		
		res.json(results.reverse()); // So earliest dates come first
	});
});

/*******
router.get('/quote-status-count', (req, res) => {
	const sql = `
		SELECT status, COUNT(*) AS count 
		FROM ro_cpq.quotation		
		GROUP BY status;
	`;

	db.query(sql, (err, results) => {
		if (err) {
			console.error("Error fetching quote status count:", err);
			return res.status(500).json({ error: "Failed to fetch quote status" });
		}
		res.json(results);
	});
});
***********/

router.get('/monthly-conversion', (req, res) => {
	const sql = `
		SELECT 
			MONTHNAME(date_created) AS month, 
			SUM(CASE WHEN status = 'Finalized' THEN 1 ELSE 0 END) AS converted,
			COUNT(*) AS total
		FROM ro_cpq.quotation
		WHERE YEAR(date_created) = YEAR(CURDATE())
		GROUP BY MONTHNAME(date_created)
		ORDER BY MONTHNAME(date_created);
	`;

	db.query(sql, (err, results) => {
		if (err) {
			console.error("Error fetching conversion data:", err);
			return res.status(500).json({ error: "Failed to fetch conversion data" });
		}
		const formatted = results.map(row => ({
			month: row.month,
			conversion: Math.round((row.converted / row.total) * 100)
		}));
		res.json(formatted);
	});
});

module.exports = router;