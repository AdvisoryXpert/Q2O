const express = require('express');
const router = express.Router();

module.exports = (db) => {
  router.get('/:quote_id', (req, res) => {
    const quoteId = req.params.quote_id;
    const tenant_id = req.tenant_id;

    const query = `
      SELECT 
        qi.quote_item_id,
        qi.product_id,
        p.name AS product_name,
        pa.name AS attribute_name,
        qi.quantity,
        qi.unit_price,
        (qi.quantity * qi.unit_price) AS total_price,
        IFNULL(qi.is_selected, TRUE) AS is_selected,
        q.dealer_id
      FROM ro_cpq.quotationitems qi
      JOIN ro_cpq.product p ON qi.product_id = p.product_id
      JOIN ro_cpq.product_attribute pa ON qi.product_attribute_id = pa.attribute_id
      JOIN ro_cpq.quotation q ON qi.quote_id = q.quote_id
      WHERE qi.quote_id = ? AND qi.tenant_id = ?;
    `;

    const noteQuery = `
      SELECT note FROM ro_cpq.notes WHERE quote_id = ? AND tenant_id = ? LIMIT 1;
    `;

    db.query(query, [quoteId, tenant_id], (err, items) => {
      if (err) {
        return res.status(500).json({ error: 'Data fetch failed', details: err });
      }

      const totalSum = items.reduce((sum, item) => sum + item.total_price, 0);

      db.query(noteQuery, [quoteId, tenant_id], (noteErr, noteResult) => {
        res.json(items);
      });
    });
  });

  return router;
};