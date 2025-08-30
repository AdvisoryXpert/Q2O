// dispatchOrders.js
const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  router.get('/:orderId', (req, res) => {
    const { orderId } = req.params;

    const query = `
      SELECT 
        prd.name AS product_name, 
        attr.name AS component_name, 
        line.quantity, 
        line.unit_price, 
        line.total_price 
      FROM 
        ro_cpq.order_line line
        JOIN ro_cpq.product prd ON line.product_id = prd.product_id
        JOIN ro_cpq.product_attribute attr ON line.product_attribute_id = attr.attribute_id
      WHERE 
        line.order_id = ?
    `;

    db.query(query, [orderId], (err, results) => {
      if (err) {
        console.error('Dispatch query error:', err);
        return res.status(500).json({ error: 'Failed to fetch dispatch order lines' });
      }
      res.json({lineItems: results});
    });
  });

  // 
router.get('/order-details/:orderId', (req, res) => {
  const orderId = req.params.orderId;

  // Header Query
  const headerQuery = `
    SELECT o.order_id, o.quote_id, o.status, d.full_name AS customer_name
    FROM orders o, quotation q, dealer d
    WHERE o.quote_id = q.quote_id
      AND q.dealer_id = d.dealer_id
      AND o.order_id = ?
  `;

  // Line Items Query
  const lineItemsQuery = `
    SELECT prd.name AS product_name, att.name AS attribute_name, ln.quantity, ln.unit_price
    FROM order_line ln, product_attribute att, product prd
    WHERE ln.product_id = prd.product_id
      AND ln.product_attribute_id = att.attribute_id
      AND ln.order_id = ?
  `;

  db.query(headerQuery, [orderId], (err, headerResult) => {
    if (err) {
      console.error('Header fetch error:', err);
      return res.status(500).json({ error: 'Failed to fetch order header' });
    }

    if (headerResult.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    db.query(lineItemsQuery, [orderId], (err, lineResult) => {
      if (err) {
        console.error('Line item fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch line items' });
      }

      // Add total price to each line
      const lineItems = lineResult.map(item => ({
        ...item,
        total_price: item.unit_price * item.quantity,
        product_name: `${item.product_name} (${item.attribute_name})`
      }));

      res.json({
        header: headerResult[0],
        lineItems,
      });
    });
  });
});
  return router;
};
