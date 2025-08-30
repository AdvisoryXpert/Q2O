const express = require('express');
const router = express.Router();
const db = require('../db');

// Create a new order (without quote)
router.post('/', (req, res) => {
  const { user_id, dealer_id, total_price, cartItems } = req.body;

  if (!user_id || !dealer_id || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: 'Invalid order data' });
  }

  const orderData = {
    user_id,
    dealer_id,
    total_price,
    status: 'For Dispatch',
    date_created: new Date()
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
      item.serial_number || null
    ]);

    const insertLineQuery = `
      INSERT INTO order_line 
      (order_id, product_id, product_attribute_id, unit_price, total_price, quantity, original_quote_item_id, serial_number)
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

module.exports = router;
