// dealers.js
const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  // GET all dealers (tenant)
  router.get('/', (req, res) => {
    db.query('SELECT * FROM ro_cpq.dealer WHERE tenant_id = ? ORDER BY dealer_id DESC',
      [req.tenant_id],
      (err, results) => {
        if (err) {
          console.error('DB Error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
      }
    );
  });

  // GET dealer by ID (tenant)
  router.get('/:id', (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Dealer ID is required" });

    const query = 'SELECT * FROM ro_cpq.dealer WHERE dealer_id = ? AND tenant_id = ?';
    db.query(query, [id, req.tenant_id], (err, results) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Dealer not found' });
      }
      res.json(results[0]);
    });
  });

  // GET dealer by phone (tenant)
  router.get('/by-phone/:phone', (req, res) => {
    const { phone } = req.params;
    if (!phone) return res.status(400).json({ error: "Phone number is required" });

    const query = 'SELECT * FROM ro_cpq.dealer WHERE phone = ? AND tenant_id = ?';
    db.query(query, [phone, req.tenant_id], (err, results) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results);
    });
  });

  // POST a new dealer (stamp tenant)
  router.post('/', (req, res) => {
    const { full_name, location, email, phone, gst_number, is_important = false, account_type = null } = req.body;

    db.query(
      `INSERT INTO ro_cpq.dealer 
        (tenant_id, full_name, location, email, phone, gst_number, account_type, date_created, is_important)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [req.tenant_id, full_name, location, email, phone, gst_number, account_type, is_important],
      (err, result) => {
        if (err) {
          console.error('Insert Error:', err);
          return res.status(500).json({ error: 'Insert failed' });
        }
        res.json({ dealer_id: result.insertId });
      }
    );
  });

  // PUT update dealer (guard by tenant)
  router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { full_name, location, email, phone, gst_number, account_type, is_important } = req.body;

    db.query(
      `UPDATE ro_cpq.dealer 
       SET full_name=?, location=?, email=?, phone=?, gst_number=?, account_type=?, is_important=?
       WHERE dealer_id=? AND tenant_id=?`,
       [full_name, location, email, phone, gst_number, account_type, is_important, id, req.tenant_id],
      (err) => {
        if (err) {
          console.error('Update Error:', err);
          return res.status(500).json({ error: 'Update failed' });
        }
        res.json({ message: 'Dealer updated successfully' });
      }
    );
  });

  // DELETE dealer (guard by tenant)
  router.delete('/:id', (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM ro_cpq.dealer WHERE dealer_id = ? AND tenant_id = ?', [id, req.tenant_id], (err) => {
      if (err) {
        console.error('Delete Error:', err);
        return res.status(500).json({ error: 'Delete failed' });
      }
      res.json({ message: 'Dealer deleted successfully' });
    });
  });

  // GET quotation count for a dealer (tenant)
  router.get('/:id/quotations/count', (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Dealer ID is required" });

    const query = 'SELECT COUNT(*) as quotationCount FROM ro_cpq.quotation WHERE dealer_id = ? AND tenant_id = ?';
    db.query(query, [id, req.tenant_id], (err, results) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results[0]);
    });
  });

  return router;
};
