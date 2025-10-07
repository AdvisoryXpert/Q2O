const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  // Create a new order (without quote)
  router.post('/', (req, res) => {
    const { user_id, dealer_id, total_price, cartItems } = req.body;
    const tenant_id = req.tenant_id;

    if (!user_id || !dealer_id || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: 'Invalid order data' });
    }

    const orderData = {
      user_id,
      dealer_id,
      total_price,
      status: 'For Dispatch',
      date_created: new Date(),
      tenant_id
    };

    db.query('INSERT INTO orders SET ?', orderData, (err, orderResult) => {
      if (err) {
        console.error('Failed to insert order:', err);
        return res.status(500).json({ error: 'Failed to create order' });
      }

      const order_id = orderResult.insertId;

      // Prepare line items
      const lineItems = cartItems.map(item => [
        order_id,
        item.product_id,
        item.product_attribute_id,
        item.unit_price,
        item.total_price,
        item.quantity,
        item.original_quote_item_id || null,
        item.serial_number || null,
        tenant_id
      ]);

      const insertLineQuery = `
        INSERT INTO order_line 
        (order_id, product_id, product_attribute_id, unit_price, total_price, quantity, original_quote_item_id, serial_number, tenant_id)
        VALUES ?
      `;

      db.query(insertLineQuery, [lineItems], (err) => {
        if (err) {
          console.error('Failed to insert order line items:', err);
          return res.status(500).json({ error: 'Failed to create order items' });
        }

        res.status(201).json({ message: 'Order created successfully', order_id });
      });
    });
  });


  // GET a specific order by ID
  router.get('/:orderId', (req, res) => {
    const { orderId } = req.params;
    const tenant_id = req.tenant_id;

    const query = `
      SELECT 
        o.order_id,
        o.quote_id,
        o.dealer_id,
        d.full_name as dealer_name,
        o.date_created,
        o.status,
        o.invoice_id
      FROM orders o
      LEFT JOIN dealer d ON o.dealer_id = d.dealer_id
      WHERE o.order_id = ? AND o.tenant_id = ?;
    `;

    db.query(query, [orderId, tenant_id], (err, results) => {
      if (err) {
        console.error('Failed to fetch order:', err);
        return res.status(500).json({ error: 'Failed to fetch order' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json(results[0]);
    });
  });

  // GET line items for a specific order
  router.get('/:orderId/items', (req, res) => {
    const { orderId } = req.params;
    const tenant_id = req.tenant_id;

    const query = 'SELECT * FROM order_line WHERE order_id = ? AND tenant_id = ?';
    db.query(query, [orderId, tenant_id], (err, results) => {
      if (err) {
        console.error('Failed to fetch order line items:', err);
        return res.status(500).json({ error: 'Failed to fetch order line items' });
      }
      res.json(results);
    });
  });

  // PUT (update) an existing order
  router.put('/:orderId', (req, res) => {
    const { orderId } = req.params;
    const { invoice_id, status } = req.body;
    const tenant_id = req.tenant_id;

    if (!invoice_id && !status) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Build the update query dynamically
    const fields = [];
    const values = [];
    if (invoice_id) {
      fields.push('invoice_id = ?');
      values.push(invoice_id);
    }
    if (status) {
      fields.push('status = ?');
      values.push(status);
    }
    values.push(orderId, tenant_id);

    const query = `UPDATE orders SET ${fields.join(', ')} WHERE order_id = ? AND tenant_id = ?`;

    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Failed to update order:', err);
        return res.status(500).json({ error: 'Failed to update order' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Order not found or no changes made' });
      }
      res.json({ message: 'Order updated successfully' });
    });
  });

  // GET status overview
  router.get('/status-overview', (req, res) => {
    const tenant_id = req.tenant_id;

    const query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM orders
      WHERE tenant_id = ?
      GROUP BY status;
    `;

    db.query(query, [tenant_id], (err, results) => {
      if (err) {
        console.error('Failed to fetch order status overview:', err);
        return res.status(500).json({ error: 'Failed to fetch order status overview' });
      }
      res.json(results);
    });
  });

  return router;
};
