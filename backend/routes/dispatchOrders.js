// dispatchOrders.js
const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  // Line items by order (tenant-safe)
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
        JOIN ro_cpq.product prd 
          ON prd.product_id = line.product_id
         AND prd.tenant_id  = line.tenant_id
        JOIN ro_cpq.product_attribute attr 
          ON attr.attribute_id = line.product_attribute_id
         AND attr.tenant_id   = line.tenant_id
      WHERE 
        line.order_id = ? AND line.tenant_id = ?
    `;

    db.query(query, [orderId, req.tenant_id], (err, results) => {
      if (err) {
        console.error('Dispatch query error:', err);
        return res.status(500).json({ error: 'Failed to fetch dispatch order lines' });
      }
      res.json({ lineItems: results });
    });
  });

  // Order header + line items (tenant-safe)
  router.get('/order-details/:orderId', (req, res) => {
    const { orderId } = req.params;

    const headerQuery = `
      SELECT o.order_id, o.quote_id, o.status, d.full_name AS customer_name
      FROM ro_cpq.orders o
      JOIN ro_cpq.quotation q
        ON q.quote_id = o.quote_id
       AND q.tenant_id = o.tenant_id
      JOIN ro_cpq.dealer d
        ON d.dealer_id = q.dealer_id
       AND d.tenant_id = q.tenant_id
      WHERE o.order_id = ? AND o.tenant_id = ?
    `;

    const lineItemsQuery = `
      SELECT prd.name AS product_name, att.name AS attribute_name, ln.quantity, ln.unit_price
      FROM ro_cpq.order_line ln
      JOIN ro_cpq.product prd
        ON prd.product_id = ln.product_id
       AND prd.tenant_id  = ln.tenant_id
      JOIN ro_cpq.product_attribute att
        ON att.attribute_id = ln.product_attribute_id
       AND att.tenant_id   = ln.tenant_id
      WHERE ln.order_id = ? AND ln.tenant_id = ?
    `;

    db.query(headerQuery, [orderId, req.tenant_id], (err, headerResult) => {
      if (err) {
        console.error('Header fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch order header' });
      }
      if (headerResult.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      db.query(lineItemsQuery, [orderId, req.tenant_id], (err, lineResult) => {
        if (err) {
          console.error('Line item fetch error:', err);
          return res.status(500).json({ error: 'Failed to fetch line items' });
        }

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
