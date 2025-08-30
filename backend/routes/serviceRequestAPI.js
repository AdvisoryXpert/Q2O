const express = require('express');
const router = express.Router();
const db = require('../db');

const createFollowup = require('./CreateFollowup');

// ✅ GET all service requests
router.get('/', (req, res) => {
  db.query('SELECT * FROM service_requests', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ✅ POST create a new request
router.post('/', (req, res) => {
 const {
  order_id,
  invoice_id,
  status = 'Open',
  dealer_id,
  user_id
} = req.body;

const sql = `
  INSERT INTO service_requests
  (order_id, invoice_id, status, dealer_id, user_id)
  VALUES (?, ?, ?, ?, ?)
`;
db.query(
  sql,
  [order_id, invoice_id, status, dealer_id, user_id],
  (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    // ✅ Create a follow-up for the new service request
    createFollowup('sr', result.insertId, user_id, user_id);

    res.status(201).json({ message: 'Request created', id: result.insertId });
  }
);
});

// PUT update request by ID
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    order_id,
    invoice_id,
    status,
    dealer_id,
    user_id,
    notes
  } = req.body;

  const sql = `
    UPDATE service_requests
    SET order_id = ?, invoice_id = ?, status = ?, dealer_id = ?, user_id = ?,notes = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [order_id, invoice_id, status, dealer_id, user_id,notes || null, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Request updated' });
    }
  );
});


module.exports = router;