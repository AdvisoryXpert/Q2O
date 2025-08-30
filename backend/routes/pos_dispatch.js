const express = require('express');
const router = express.Router();
const db = require('../db');

// Get POS order dispatch info
router.get('/:order_id', (req, res) => {
  const { order_id } = req.params;

  const orderQuery = `
    SELECT o.order_id, o.total_price, o.status, o.date_created, d.full_name AS dealer_name
    FROM ro_cpq.orders o
    LEFT JOIN ro_cpq.dealer d ON o.dealer_id = d.dealer_id
    WHERE o.order_id = ?
  `;

  const lineItemQuery = `
    SELECT 
      ol.product_id,
      ol.product_attribute_id,
      ol.quantity,
      ol.unit_price,
      ol.total_price,
      p.name AS product_name,
      pa.name AS attribute_name
    FROM ro_cpq.order_line ol
    LEFT JOIN ro_cpq.product p ON ol.product_id = p.product_id
    LEFT JOIN ro_cpq.product_attribute pa ON ol.product_attribute_id = pa.attribute_id
    WHERE ol.order_id = ?
  `;

  db.query(orderQuery, [order_id], (err, orderResult) => {
    if (err || orderResult.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult[0];

    db.query(lineItemQuery, [order_id], (err, lineResults) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch order line items' });
      }

      order.line_items = lineResults;
      res.json(order);
    });
  });
});

module.exports = router;
