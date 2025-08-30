const express = require('express'); 
const router = express.Router();
const db = require('../db');

router.post('/', (req, res) => {
  const { order_id, dispatch_items } = req.body;

  if (!dispatch_items || !Array.isArray(dispatch_items) || dispatch_items.length === 0) {
    return res.status(400).json({ error: 'No dispatch items provided' });
  }

  // Step 1: Check if already dispatched
  db.query('SELECT status FROM orders WHERE order_id = ?', [order_id], (checkErr, result) => {
    if (checkErr) return res.status(500).json({ error: checkErr.message });

    if (result[0]?.status === 'Dispatched') {
      return res.status(400).json({ error: 'This order has already been dispatched.' });
    }

    // Step 2: Process each dispatch item
    const processItem = (index) => {
      if (index >= dispatch_items.length) {
        // Step 3: Mark order as dispatched
        db.query(
          'UPDATE orders SET status = ? WHERE order_id = ?',
          ['Dispatched', order_id],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            return res.status(200).json({ message: 'Order dispatched and warranties created' });
          }
        );
        return;
      }

      const {
        order_line_id,
        serial_number,
        product_attribute_id,
        product_id,
        dealer_id,
        customer_name,
        user_id
      } = dispatch_items[index];

      // Step 2.1: Update serial number in order_line
      db.query(
        'UPDATE order_line SET serial_number = ? WHERE order_line_id = ?',
        [serial_number, order_line_id],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ error: updateErr.message });

          // Step 2.2: Get warranty_period from product_attribute
          db.query(
            'SELECT warranty_period FROM product_attribute WHERE attribute_id = ?',
            [product_attribute_id],
            (wpErr, wpResult) => {
              if (wpErr) return res.status(500).json({ error: wpErr.message });

              const warranty_period = wpResult?.[0]?.warranty_period || 12;
              const today = new Date();
              const endDate = new Date(today);
              endDate.setMonth(today.getMonth() + Number(warranty_period));

              // Step 2.3: Insert into warranty table
              db.query(
                `INSERT INTO warranty (
                  serial_number, product_id, dealer_id, customer_name,
                  start_date, end_date, warranty_period, status, user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?)`,
                [
                  serial_number,
                  product_id,
                  dealer_id,
                  customer_name,
                  today.toISOString().slice(0, 10),
                  endDate.toISOString().slice(0, 10),
                  warranty_period,
                  user_id
                ],
                (insertErr) => {
                  if (insertErr) return res.status(500).json({ error: insertErr.message });
                  processItem(index + 1); // ➤ Next item
                }
              );
            }
          );
        }
      );
    };

    processItem(0);
  });
});


// GET warranty (optionally filtered by serial number)
router.get('/', (req, res) => {
  const { serial_number } = req.query;

  let sql = `
    SELECT
      w.warranty_id,
      w.serial_number,
      w.product_id,
      p.name,
      w.dealer_id,
      d.full_name AS dealer_name,
      w.customer_name,
      w.start_date,
      w.end_date,
      w.warranty_period,
      w.status,
      COALESCE(o.invoice_id, '') AS invoice_id
    FROM warranty w
    JOIN dealer d ON w.dealer_id = d.dealer_id
    JOIN product p ON w.product_id = p.product_id
    JOIN ro_cpq.order_line ol ON w.serial_number = ol.serial_number
    JOIN ro_cpq.orders o ON ol.order_id = o.order_id    
  `;

  const params = [];

  if (serial_number) {
    sql += ' WHERE w.serial_number = ?';
    params.push(serial_number);
  }

  sql += ' ORDER BY w.start_date DESC';

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('GET /api/warranty error:', err);
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});


// Update warranty status
router.put('/:warranty_id', (req, res) => {
  const { warranty_id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Missing status in request body' });
  }

  const sql = 'UPDATE warranty SET status = ? WHERE warranty_id = ?';

  db.query(sql, [status, warranty_id], (err, result) => {
    if (err) {
      console.error('Error updating warranty status:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Warranty not found' });
    }

    return res.json({ success: true });
  });
});

module.exports = router;
