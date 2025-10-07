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

	router.put('/:quote_id/status', (req, res) => {
		const { quote_id } = req.params;
		const { status } = req.body;
		const tenant_id = req.tenant_id;

		if (!status) {
			return res.status(400).json({ error: 'New status is required' });
		}

		db.query(
			'UPDATE ro_cpq.quotation SET status = ? WHERE quote_id = ? AND tenant_id = ?',
			[status, quote_id, tenant_id],
			(err, result) => {
				if (err) {
					console.error('Error updating quotation status:', err);
					return res.status(500).json({ error: 'Failed to update quotation status' });
				}
				if (result.affectedRows === 0) {
					return res.status(404).json({ error: 'Quotation not found or no changes made' });
				}
				res.json({ message: 'Quotation status updated successfully' });
			}
		);
	});

	return router;
};