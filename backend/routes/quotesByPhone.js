// routes/quotesByPhone.js
const express = require('express');
const router = express.Router();

module.exports = (db) => {
	router.get('/by-phone/:phone', (req, res) => {
		const { phone } = req.params;
		const tenant_id = req.tenant_id;

		const sql = `
			SELECT 
				q.quote_id,
				q.status,
				kam.full_name AS assigned_kam_name,
				creator.full_name AS creator_name,
				q.dealer_id
			FROM ro_cpq.quotation q
			JOIN ro_cpq.dealer d ON q.dealer_id = d.dealer_id
			LEFT JOIN ro_cpq.users kam ON q.assigned_kam_id = kam.user_id
			LEFT JOIN ro_cpq.users creator ON q.user_id = creator.user_id
			WHERE d.phone = ? AND q.tenant_id = ? and q.status = 'Draft'
			ORDER BY q.date_created DESC;
		`;

		db.query(sql, [phone, tenant_id], (err, results) => {
			if (err) {
				console.error('Error fetching quotes by phone:', err);
				return res.status(500).json({ error: 'Failed to fetch quotes by phone' });
			}
			res.json(results);
		});
	});

	return router;
};