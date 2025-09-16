const express = require('express');
const router = express.Router();
const db = require('../db');
const util = require('util');

// Promisify db.query to use async/await
const query = util.promisify(db.query).bind(db);

//Fetch Quotes by dealer id
// GET: Quotes filtered by dealer_id
router.get('/quotes_by_dealer/:dealer_id', (req, res) => {
  const { dealer_id } = req.params;
  const tenant_id = req.tenant_id;

  const sql = `
    SELECT 
      q.quote_id,
      q.user_id,
      q.total_price,
      q.date_created,
      q.status,
      d.full_name AS dealer_name
    FROM 
      ro_cpq.quotation q
    JOIN 
      ro_cpq.dealer d ON d.dealer_id = q.dealer_id
    WHERE 
      q.dealer_id = ? AND q.tenant_id = ?
    ORDER BY 
      q.date_created DESC
  `;

  db.query(sql, [dealer_id, tenant_id], (err, results) => {
    if (err) {
      console.error('Error fetching dealer quotes:', err);
      return res.status(500).json({ error: 'Failed to fetch quotes for dealer' });
    }
    res.json(results);
  });
});

// Fetch QUotes with dealer name
router.get('/quotes_dtls', (req, res) => {
  const tenant_id = req.tenant_id;
  const sql = `
    SELECT 
      q.quote_id,
      q.user_id,
      q.total_price,
      q.date_created,
      q.status,
      d.full_name AS dealer_id
    FROM 
      ro_cpq.quotation q
    LEFT OUTER JOIN 
      ro_cpq.dealer d ON d.dealer_id = q.dealer_id
    WHERE q.tenant_id = ?
    ORDER BY 
      q.date_created DESC
  `;

  db.query(sql, [tenant_id], (err, results) => {
    if (err) {
      console.error('Error fetching quotes:', err);
      return res.status(500).json({ error: 'Failed to fetch quotes' });
    }
    res.json(results);
  });
});


// Create a dispatch order from a quote
router.post('/:quote_id', async (req, res) => {
  const { quote_id } = req.params;
  const tenant_id = req.tenant_id;

  try {
    // Get selected quotation items and join with products to get product_name
    const selectedItems = await query(
      `SELECT qi.*, p.name as product_name 
       FROM ro_cpq.quotationitems qi
       JOIN ro_cpq.product p ON qi.product_id = p.product_id
       WHERE qi.quote_id = ? AND qi.tenant_id = ? AND qi.is_selected = 1`,
      [quote_id, tenant_id]
    );

    if (selectedItems.length === 0) {
      return res.status(400).json({ error: 'No items selected to create an order.' });
    }

    // Check if an order already exists for any of the selected items
    const productTuples = selectedItems.map(item => [item.product_id, item.product_attribute_id]);

    const existingOrderLines = await query(
      `SELECT o.order_id, ol.product_id, ol.product_attribute_id
       FROM ro_cpq.order_line ol
       JOIN ro_cpq.orders o ON ol.order_id = o.order_id
       WHERE o.quote_id = ? AND (ol.product_id, ol.product_attribute_id) IN (?)`,
      [quote_id, productTuples]
    );

    if (existingOrderLines.length > 0) {
      const alreadyOrderedItems = selectedItems.filter(si =>
        existingOrderLines.some(eol =>
          eol.product_id === si.product_id && eol.product_attribute_id === si.product_attribute_id
        )
      );

      const errorDetails = alreadyOrderedItems.map(item => {
        const orderLine = existingOrderLines.find(eol =>
          eol.product_id === item.product_id && eol.product_attribute_id === item.product_attribute_id
        );
        return {
          product_name: item.product_name,
          order_id: orderLine.order_id
        };
      });

      const errorMessages = errorDetails.map(detail =>
        `Product "${detail.product_name}" is already in Order ID: ${detail.order_id}`
      );

      return res.status(400).json({
        error: `Order already created for some items:\n${errorMessages.join('\n')}`
      });
    }

    // --- Proceed with order creation ---

    // Fetch quote details
    const quotesResult = await query('SELECT * FROM ro_cpq.quotation WHERE quote_id = ? AND tenant_id = ?', [quote_id, tenant_id]);
    if (quotesResult.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    const quote = quotesResult[0];

    // Calculate total price from selected items
    const totalPrice = selectedItems.reduce((sum, item) => sum + item.total_price, 0);

    // Insert into orders
    const orderData = {
      quote_id: quote.quote_id,
      user_id: quote.user_id,
      dealer_id: quote.dealer_id,
      total_price: totalPrice,
      status: 'For Dispatch',
      date_created: new Date(),
      tenant_id
    };
    const orderResult = await query('INSERT INTO ro_cpq.orders SET ?', orderData);
    const order_id = orderResult.insertId;

    // Insert into order_line_items
    const values = selectedItems.map(item => [
      order_id,
      item.product_id,
      item.product_attribute_id,
      item.unit_price,
      item.total_price,
      item.quantity,
      tenant_id
    ]);

    const insertQuery = `
      INSERT INTO ro_cpq.order_line (order_id, product_id, product_attribute_id, unit_price, total_price, quantity, tenant_id)
      VALUES ?
    `;
    await query(insertQuery, [values]);

    res.status(201).json({
      message: 'Dispatch order created successfully',
      order_id
    });

  } catch (error) {
    console.error('Error creating dispatch order:', error);
    res.status(500).json({ error: 'Failed to create dispatch order' });
  }
});

module.exports = router;
