const express = require('express');
const router = express.Router();

module.exports = (db) => {
  router.get('/', (req, res) => {
    const showAll = req.query.all === 'true';

    const baseQuery = `
      SELECT 
        pa.product_id,
        p.name AS product_name,
        pa.attribute_id,
        pa.name AS attribute_name,
        prc.price
      FROM ro_cpq.product_attribute pa
      JOIN ro_cpq.product p ON pa.product_id = p.product_id
      JOIN ro_cpq.product_pricing prc ON prc.attribute_id = pa.attribute_id
      ORDER BY pa.product_id
    `;

    if (showAll) {
      db.query(baseQuery, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Data fetch failed' });

        const productMap = {};
        rows.forEach(row => {
          const pid = row.product_id;
          if (!productMap[pid]) {
            productMap[pid] = {
              product_id: pid,
              product_name: row.product_name,
              variants: []
            };
          }
          productMap[pid].variants.push({
            attribute_id: row.attribute_id,
            attribute_name: row.attribute_name,
            price: parseFloat(row.price) || 0
          });
        });

        res.json({ products: Object.values(productMap) });
      });
    } else {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;

      const countQuery = `
        SELECT COUNT(DISTINCT pa.product_id) AS total
        FROM ro_cpq.product_attribute pa
        JOIN ro_cpq.product p ON pa.product_id = p.product_id
      `;

      const dataQuery = `${baseQuery} LIMIT ? OFFSET ?`;

      db.query(countQuery, (err, countResult) => {
        if (err) return res.status(500).json({ error: 'Count failed' });
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        db.query(dataQuery, [limit, offset], (err, rows) => {
          if (err) return res.status(500).json({ error: 'Data fetch failed' });

          const productMap = {};
          rows.forEach(row => {
            const pid = row.product_id;
            if (!productMap[pid]) {
              productMap[pid] = {
                product_id: pid,
                product_name: row.product_name,
                variants: []
              };
            }
            productMap[pid].variants.push({
              attribute_id: row.attribute_id,
              attribute_name: row.attribute_name,
              price: parseFloat(row.price) || 0
            });
          });

          res.json({
            products: Object.values(productMap),
            totalPages
          });
        });
      });
    }
  });

  return router;
};
