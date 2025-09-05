const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all follow-ups (tenant-scoped; optional user filtering)
router.get('/', (req, res) => {
  const { userRole, userId } = req.query;

  let sql = `
    SELECT 
      fu.*, 
      sr.invoice_id,
      lr.lr_number
    FROM ro_cpq.follow_ups fu
    LEFT JOIN ro_cpq.service_requests sr 
      ON fu.entity_id = sr.id AND fu.entity_type = 'sr' AND sr.tenant_id = fu.tenant_id
    LEFT JOIN ro_cpq.lr_receipts lr 
      ON fu.entity_id = lr.id AND fu.entity_type = 'lr' AND lr.tenant_id = fu.tenant_id
    WHERE fu.tenant_id = ?
  `;
  const params = [req.tenant_id];

  if ((userRole || '').toLowerCase() === 'employee') {
    sql += ' AND fu.assigned_to = ?';
    params.push(userId);
  } else if ((userRole || '').toLowerCase() !== 'admin') {
    return res.json([]); // other roles see nothing
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Fetch error:', err);
      return res.status(500).json({ error: 'Failed to fetch follow-ups' });
    }
    res.json(results);
  });
});

// Update follow-up (guard by tenant)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { status, assigned_to, due_date, notes } = req.body;

  const cleanDate = (s) => (!s ? null : (s.includes('T') ? s.split('T')[0] : s));

  const sql = `
    UPDATE ro_cpq.follow_ups
    SET status = ?, assigned_to = ?, due_date = ?, notes = ?
    WHERE followup_id = ? AND tenant_id = ?
  `;

  db.query(sql, [status, assigned_to, cleanDate(due_date), notes || null, id, req.tenant_id], (err) => {
    if (err) {
      console.error('Update error:', err);
      return res.status(500).json({ error: 'Update failed' });
    }
    res.json({ message: 'Follow-up updated' });
  });
});

// Create follow-up (stamp tenant)
router.post('/', (req, res) => {
  const { entity_type, entity_id, assigned_to, created_by, due_date, notes } = req.body;
  const followup_id = `FU-${Date.now()}`;

  const sql = `
    INSERT INTO ro_cpq.follow_ups
      (tenant_id, followup_id, entity_type, entity_id, assigned_to, created_by, due_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [req.tenant_id, followup_id, entity_type, entity_id, assigned_to, created_by, due_date || null, notes || null],
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
