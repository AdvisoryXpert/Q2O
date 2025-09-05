const express = require('express');
const router = express.Router();
const db = require('../db');


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
    // Fetch quote details
    db.query('SELECT * FROM quotation WHERE quote_id = ? AND tenant_id = ?', [quote_id, tenant_id], (err, quotesResult) => {
      if (err || quotesResult.length === 0) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      const quote = quotesResult[0];

      // Insert into orders
      const orderData = {
        quote_id: quote.quote_id,
        user_id: quote.user_id,
        dealer_id: quote.dealer_id,
        total_price: quote.total_price,
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

        // Fetch all quotation items for the quote
        db.query('SELECT * FROM quotationitems WHERE is_selected=1 and quote_id = ? AND tenant_id = ?', [quote_id, tenant_id], (err, itemsResult) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch quote items' });
          }

          // Insert each into order_line_items
          const values = itemsResult.map(item => [
            order_id,
            item.product_id,
            item.product_attribute_id,
            item.unit_price,
            item.total_price,
            item.quantity,
            tenant_id
          ]);

          if (values.length === 0) {
            return res.status(200).json({ message: 'Order created with no items.', order_id });
          }

          const insertQuery = `
            INSERT INTO order_line (order_id, product_id, product_attribute_id,unit_price, total_price, quantity, tenant_id)
            VALUES ?
          `;

          db.query(insertQuery, [values], (err) => {
            if (err) {
              console.error('Failed to insert line items:', err);
              return res.status(500).json({ error: 'Failed to create order items' });
            }

            res.status(201).json({
              message: 'Dispatch order created successfully',
              order_id
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;