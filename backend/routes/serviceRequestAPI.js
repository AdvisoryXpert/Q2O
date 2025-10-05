const express = require('express');
const router = express.Router();
const db = require('../db');

const createFollowup = require('./CreateFollowup');

// ✅ GET all service requests (tenant-safe)
router.get('/', (req, res) => {
  const tenant_id = req.tenant_id;
  db.query(
    'SELECT * FROM service_requests WHERE tenant_id = ?',
    [tenant_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// ✅ POST create a new request (tenant-safe)
router.post('/', (req, res) => {
  const { order_id, invoice_id, status = 'Open', dealer_id, user_id } = req.body;
  const tenant_id = req.tenant_id;

  // basic required checks
  if (!order_id || !dealer_id || !user_id) {
    return res.status(400).json({ error: 'order_id, dealer_id, and user_id are required' });
  }

  const allowed = ['Open', 'In Progress', 'Closed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status. Use 'Open' | 'In Progress' | 'Closed'." });
  }

  const sql = `
    INSERT INTO service_requests
      (order_id, invoice_id, status, dealer_id, user_id, tenant_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [order_id, invoice_id || null, status, dealer_id, user_id, tenant_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    // optional follow-up creation (errors here shouldn't block the response)
    try {
      createFollowup(tenant_id, 'sr', result.insertId, user_id, user_id);
    } catch (_) {}

    res.status(201).json({ message: 'Request created', id: result.insertId });
  });
});

// ✅ PUT update request by ID (only status & notes; never touches order_id)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const tenant_id = req.tenant_id;

  const { status, notes } = req.body; // only allowed fields

  // validate status if provided
  const allowed = ['Open', 'In Progress', 'Closed'];
  if (status !== undefined && !allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status. Use 'Open' | 'In Progress' | 'Closed'." });
  }

  // build SET from only provided fields (status/notes)
  const sets = [];
  const vals = [];

  if (status !== undefined) {
    sets.push('status = ?');
    vals.push(status);
  }
  if (notes !== undefined) {
    sets.push('notes = ?');
    vals.push(notes === '' ? null : notes);
  }

  if (sets.length === 0) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  const sql = `
    UPDATE service_requests
       SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = ? AND tenant_id = ?
  `;
  vals.push(id, tenant_id);

  db.query(sql, vals, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Service Request not found for this tenant' });
    }
    res.json({ message: 'Request updated' });
  });
});

module.exports = router;
