const express = require('express');
const router = express.Router();

module.exports = (db) => {
  router.get('/:quote_id', (req, res) => {
    const quoteId = req.params.quote_id;

    const query = `
      SELECT 
        qi.quote_item_id,
        qi.product_id,
        p.name AS product_name,
        pa.name AS attribute_name,
        qi.quantity,
        qi.unit_price,
        (qi.quantity * qi.unit_price) AS total_price,
        IFNULL(qi.is_selected, TRUE) AS is_selected
      FROM ro_cpq.quotationitems qi
      JOIN ro_cpq.product p ON qi.product_id = p.product_id
      JOIN ro_cpq.product_attribute pa ON qi.product_attribute_id = pa.attribute_id
      WHERE qi.quote_id = ?;
    `;

    const noteQuery = `
      SELECT note FROM ro_cpq.notes WHERE quote_id = ? LIMIT 1;
    `;

    db.query(query, [quoteId], (err, items) => {
      if (err) {
        return res.status(500).json({ error: 'Data fetch failed', details: err });
      }

      const totalSum = items.reduce((sum, item) => sum + item.total_price, 0);

      db.query(noteQuery, [quoteId], (noteErr, noteResult) => {
        const note = !noteErr && noteResult.length > 0 ? noteResult[0].note : '';
        res.json({ items, totalSum, note });
      });
    });
  });

  return router;
};