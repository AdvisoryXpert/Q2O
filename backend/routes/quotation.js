module.exports = (db) => {
	const router = require('express').Router();

	router.get('/:quote_id', (req, res) => {
		const quoteId = req.params.quote_id;
		const tenant_id = req.tenant_id;

		const sql = `
			SELECT
				q.*,
				d.full_name AS dealer_name,
				d.phone AS dealer_contact
			FROM ro_cpq.quotation q
			LEFT JOIN ro_cpq.dealer d ON q.dealer_id = d.dealer_id
			WHERE q.quote_id = ? AND q.tenant_id = ?
		`;

		db.query(sql, [quoteId, tenant_id], (err, results) => {
			if (err) {
				console.error('Error fetching quotation:', err);
				return res.status(500).json({ error: 'Failed to fetch quotation' });
			}
			if (results.length === 0) {
				return res.status(404).json({ error: 'Quotation not found' });
			}
			res.json(results[0]);
		});
	});

	return router;
};