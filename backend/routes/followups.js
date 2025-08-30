const express = require('express');
const router = express.Router();
const db = require('../db');

// ✅ GET all follow-ups
router.get('/', (req, res) => {
  const { userRole, userId } = req.query;
  console.log("[DEBUG] userRole is :", userRole);
  console.log("[userId] userRole is :", userId);
  let sql = `
    SELECT 
      fu.*, 
      sr.invoice_id,
      lr.lr_number
    FROM follow_ups fu
    LEFT JOIN service_requests sr ON fu.entity_id = sr.id AND fu.entity_type = 'sr'
    LEFT JOIN lr_receipts lr ON fu.entity_id = lr.id AND fu.entity_type = 'lr'
  `;
  const params = [];

  if (userRole?.toLowerCase() === 'employee') {
    sql += ' WHERE fu.assigned_to = ?';
    params.push(userId);
  } else if (userRole?.toLowerCase() !== 'admin') {
    // For any other role (e.g., Customer), return no data
    return res.json([]);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Fetch error:', err);
      return res.status(500).json({ error: 'Failed to fetch follow-ups' });
    }
    res.json(results);
  });
});
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { status, assigned_to, due_date, notes } = req.body;

  const cleanDate = (dateStr) => {
    if (!dateStr) return null;
    return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  };

  const sql = `
    UPDATE follow_ups
    SET status = ?, assigned_to = ?, due_date = ?, notes = ?
    WHERE followup_id = ?
  `;

  db.query(sql, [status, assigned_to, cleanDate(due_date), notes || null, id], (err) => {
    if (err) {
      console.error('Update error:', err);
      return res.status(500).json({ error: 'Update failed' });
    }
    res.json({ message: 'Follow-up updated' });
  });
});

// ✅ (Optional) POST create follow-up
router.post('/', (req, res) => {
  const {
    entity_type,
    entity_id,
    assigned_to,
    created_by,
    due_date,
    notes,
  } = req.body;

  const followup_id = `FU-${Date.now()}`;

  const sql = `
    INSERT INTO follow_ups
    (followup_id, entity_type, entity_id, assigned_to, created_by, due_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      followup_id,
      entity_type,
      entity_id,
      assigned_to,
      created_by,
      due_date || null,
      notes || null,
    ],
    (err) => {
      if (err) {
        console.error('Insert error:', err);
        return res.status(500).json({ error: 'Insert failed' });
      }
      res.status(201).json({ message: 'Follow-up created', followup_id });
    }
  );
});

module.exports = router;
