const express = require('express'); 
const router = express.Router();
const db = require('../db');

// Dispatch & create warranties (tenant-safe)
router.post('/', (req, res) => {
  const { order_id, dispatch_items } = req.body;

  if (!dispatch_items || !Array.isArray(dispatch_items) || dispatch_items.length === 0) {
    return res.status(400).json({ error: 'No dispatch items provided' });
  }

  // Step 1: Check if already dispatched (tenant)
  db.query('SELECT status FROM ro_cpq.orders WHERE order_id = ? AND tenant_id = ?', [order_id, req.tenant_id], (checkErr, result) => {
    if (checkErr) return res.status(500).json({ error: checkErr.message });

    if (result[0]?.status === 'Dispatched') {
      return res.status(400).json({ error: 'This order has already been dispatched.' });
    }

    // Step 2: Process each dispatch item
    const processItem = (index) => {
      if (index >= dispatch_items.length) {
        // Step 3: Mark order as dispatched (tenant)
        db.query(
          'UPDATE ro_cpq.orders SET status = ? WHERE order_id = ? AND tenant_id = ?',
          ['Dispatched', order_id, req.tenant_id],
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

      // 2.1 Update serial number in order_line (tenant)
      db.query(
        'UPDATE ro_cpq.order_line SET serial_number = ? WHERE order_line_id = ? AND tenant_id = ?',
        [serial_number, order_line_id, req.tenant_id],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ error: updateErr.message });

          // 2.2 Get warranty_period (tenant)
          db.query(
            'SELECT warranty_period FROM ro_cpq.product_attribute WHERE attribute_id = ? AND tenant_id = ?',
            [product_attribute_id, req.tenant_id],
            (wpErr, wpResult) => {
              if (wpErr) return res.status(500).json({ error: wpErr.message });

              const warranty_period = wpResult?.[0]?.warranty_period || 12;
              const today = new Date();
              const endDate = new Date(today);
              endDate.setMonth(today.getMonth() + Number(warranty_period));

              // 2.3 Insert into warranty (stamp tenant)
              db.query(
                `INSERT INTO ro_cpq.warranty (
                  tenant_id, serial_number, product_id, dealer_id, customer_name,
                  start_date, end_date, warranty_period, status, user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)`,
                [
                  req.tenant_id,
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
                  processItem(index + 1);
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

// GET warranty (tenant-safe joins)
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
    FROM ro_cpq.warranty w
    JOIN ro_cpq.dealer d 
      ON w.dealer_id = d.dealer_id AND d.tenant_id = w.tenant_id
    JOIN ro_cpq.product p 
      ON w.product_id = p.product_id AND p.tenant_id = w.tenant_id
    JOIN ro_cpq.order_line ol 
      ON w.serial_number = ol.serial_number AND ol.tenant_id = w.tenant_id
    JOIN ro_cpq.orders o 
      ON ol.order_id = o.order_id AND o.tenant_id = w.tenant_id
    WHERE w.tenant_id = ?
  `;
  const params = [req.tenant_id];

  if (serial_number) {
    sql += ' AND w.serial_number = ?';
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

// Update warranty status (guard by tenant)
router.put('/:warranty_id', (req, res) => {
  const { warranty_id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Missing status in request body' });
  }

  const sql = 'UPDATE ro_cpq.warranty SET status = ? WHERE warranty_id = ? AND tenant_id = ?';

  db.query(sql, [status, warranty_id, req.tenant_id], (err, result) => {
    if (err) {
      console.error('Error updating warranty status:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Warranty not found for this tenant' });
    }
    return res.json({ success: true });
  });
});

module.exports = router;
