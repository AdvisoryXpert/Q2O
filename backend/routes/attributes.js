const express = require('express');
const router = express.Router();
const db = require('../db'); // uses shared pool

router.get('/test', (req, res) => {
  res.json({ message: 'Attributes route working fine ✅' });
});

// Get attributes by product ID (tenant-safe join)
router.get('/:product_id', (req, res) => {
  const { product_id } = req.params;

  const sql = `
    SELECT 
      attr.attribute_id, attr.product_id, attr.name, prc.price
    FROM ro_cpq.product_attribute AS attr
    JOIN ro_cpq.product_pricing AS prc
      ON prc.attribute_id = attr.attribute_id
     AND prc.tenant_id   = attr.tenant_id
    WHERE attr.product_id = ?
      AND attr.tenant_id = ?
    ORDER BY attr.attribute_id ASC;
  `;

  db.query(sql, [product_id, req.tenant_id], (err, results) => {
    if (err) {
      console.error('Error fetching attributes:', err);
      return res.status(500).json({ error: 'Failed to fetch attributes' });
    }
    res.json(results);
  });
});

module.exports = router;
