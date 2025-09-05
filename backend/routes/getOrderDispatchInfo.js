const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/:orderId', (req, res) => {
  const { orderId } = req.params;
  const tenant_id = req.tenant_id;

  // Fetch dealer info from order and dealer tables
  db.query(
    `SELECT o.dealer_id, d.full_name AS dealer_name
     FROM orders o
     LEFT JOIN dealer d ON o.dealer_id = d.dealer_id
     WHERE o.order_id = ? AND o.tenant_id = ?`,
    [orderId, tenant_id],
    (err, dealerResult) => {
      if (err) return res.status(500).json({ error: err.message });
      if (dealerResult.length === 0) return res.status(404).json({ error: 'Order not found' });

      const dealer_id = dealerResult[0].dealer_id;
      const dealer_name = dealerResult[0].dealer_name;

      // Fetch order lines
      db.query(
        `SELECT * FROM order_line WHERE order_id = ? AND tenant_id = ?`,
        [orderId, tenant_id],
        (err2, lineItems) => {
          if (err2) return res.status(500).json({ error: err2.message });

          res.json({ dealer_id, dealer_name, lineItems });
        }
      );
    }
  );
});

module.exports = router;