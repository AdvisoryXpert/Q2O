// backend/routes/reminders.js
module.exports = (db) => {
	const router = require('express').Router();

	router.get('/', async (req, res) => {
		const user_id = req.query.user_id;
		const tenant_id = req.tenant_id;
	
		if (!user_id) {
			return res.status(400).json({ error: 'Missing user_id in query' });
		}
		try {
			const [quotes, lrs, services] = await Promise.all([
				new Promise((resolve, reject) => {
					db.query(
						`SELECT q.quote_id, u.full_name
						 FROM ro_cpq.quotation q
						 JOIN ro_cpq.users u ON q.user_id = u.user_id
						 WHERE q.status = 'Draft' AND q.user_id = ? AND q.tenant_id = ?`,
						[user_id, tenant_id],
						(err, results) => err ? reject(err) : resolve(results)
					);
				}),
				new Promise((resolve, reject) => {
					db.query(
						`SELECT l.id AS lr_id, l.lr_number, u.full_name
						 FROM ro_cpq.lr_receipts l
						 JOIN ro_cpq.users u ON l.user_id = u.user_id
						 WHERE l.status IN ('Pending', 'Open') AND l.user_id = ? AND l.tenant_id = ?`,
						[user_id, tenant_id],
						(err, results) => err ? reject(err) : resolve(results)
					);
				}),
				new Promise((resolve, reject) => {
					db.query(
						`SELECT s.id AS service_id, u.full_name, s.status
						FROM ro_cpq.service_requests s
						JOIN ro_cpq.users u ON s.user_id = u.user_id
						WHERE s.status in ('Open','In Progress') AND s.user_id = ? AND s.tenant_id = ?`,
						[user_id, tenant_id],
						(err, results) => err ? reject(err) : resolve(results)
					);
				})
			]);

			const quoteReminders = quotes.map(q => ({
				type: 'quote',
				quoteId: q.quote_id,
				title: `Follow up on Quote id ${q.quote_id}`
			}));

			const lrReminders = lrs.map(lr => ({
				type: 'lr',
				lrId: lr.lr_id,
				title: `Track LR Receipt (${lr.lr_number}) by ${lr.full_name}`
			}));

			const serviceReminders = services.map(s => ({
				type: 'service',
				serviceId: s.service_id,
				title: `Service follow-up: ${s.service_id} by ${s.full_name}`
			}));

			res.json([...quoteReminders, ...lrReminders, ...serviceReminders]);

		} catch (err) {
			console.error('DB error in reminders route:', err);
			res.status(500).json({ error: 'Server error while fetching reminders' });
		}
	});

	return router;
};