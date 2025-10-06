module.exports = (db) => {
	const router = require('express').Router();

	router.post('/:quote_id', (req, res) => {
		const quoteId = req.params.quote_id;
		const items = req.body;
		const tenant_id = req.tenant_id;

		const updatePromises = items.map(item => {
			return new Promise((resolve, reject) => {
				const sql = `
					UPDATE quotationitems
                    SET product_attribute_id = ?, unit_price = ?, quantity = ?, is_selected = ?
                    WHERE quote_item_id = ? AND tenant_id = ?
				`;
				db.query(
					sql,
					[item.product_attribute_id, item.unit_price, item.quantity, item.is_selected ? 1 : 0, item.quote_item_id, tenant_id],
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
			.then(() => {
				const totalPrice = items.reduce((total, item) => {
					if (item.is_selected) {
						return total + (item.unit_price * item.quantity);
					}
					return total;
				}, 0);

				const updateQuotationSql = 'UPDATE quotation SET total_price = ? WHERE quote_id = ? AND tenant_id = ?';
				db.query(updateQuotationSql, [totalPrice, quoteId, tenant_id], (err, result) => {
					if (err) {
						console.error('Failed to update total price:', err);
						return res.status(500).json({ success: false, message: 'Failed to update total price' });
					}
					console.log('Total price updated successfully.');
					res.json({ success: true });
				});
			})
			.catch(err => {
				console.error("Error saving items:", err);
				res.status(500).json({ success: false, message: "DB error" });
			});
	});

	return router;
};