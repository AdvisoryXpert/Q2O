module.exports = (db) => {
	const router = require('express').Router();

	router.post('/:quote_id', (req, res) => {
		const quoteId = req.params.quote_id;
		const items = req.body;

		const updatePromises = items.map(item => {
			return new Promise((resolve, reject) => {
				const sql = `
					UPDATE quotationitems
                    SET product_attribute_id = ?, unit_price = ?,  is_selected = ?
                    WHERE quote_item_id = ?
				`;
				db.query(
					sql,
					[item.product_attribute_id, item.unit_price, item.is_selected ? 1 : 0, item.quote_item_id],
					(err, result) => {
					  if (err) {
						console.error('Update failed:', err);
						reject(err);
					} else {
						console.log('Updated rows:', result.affectedRows);						
						resolve(result);
					}
					}
				  );
			});
		});

		Promise.all(updatePromises)
			.then(() => res.json({ success: true }))
			.catch(err => {
				console.error("Error saving items:", err);
				res.status(500).json({ success: false, message: "DB error" });
			});
	});

	return router;
};
