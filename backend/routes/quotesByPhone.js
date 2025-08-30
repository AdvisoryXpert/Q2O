// routes/quotesByPhone.js
const express = require('express');
const router = express.Router();

module.exports = (db) => {
	router.get('/by-phone/:phone', (req, res) => {
		const { phone } = req.params;

		const sql = `
			SELECT 
				q.quote_id,
				q.status,
				u.full_name AS user_name
			FROM ro_cpq.quotation q
			JOIN ro_cpq.dealer d ON q.dealer_id = d.dealer_id
			LEFT JOIN ro_cpq.users u ON q.user_id = u.user_id
			WHERE d.phone = ?
			ORDER BY q.date_created DESC;
		`;

		db.query(sql, [phone], (err, results) => {
			if (err) {
				console.error('Error fetching quotes by phone:', err);
				return res.status(500).json({ error: 'Failed to fetch quotes by phone' });
			}
			res.json(results);
		});
	});

	return router;
};
