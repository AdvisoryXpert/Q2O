const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // Get all account types (tenant-scoped)
  router.get('/', (req, res) => {
    const { category } = req.query;
    let query = 'SELECT * FROM ro_cpq.account_types WHERE tenant_id = ?';
    const params = [req.tenant_id];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    db.query(query, params, (err, results) => {
      if (err) {
        console.error('[ERROR] DB error during fetching account types:', err);
        return res.status(500).json({ success: false, message: 'DB error' });
      }
      res.json(results);
    });
  });

  // Create a new account type (stamp tenant_id)
  router.post('/', (req, res) => {
    const { account_type_name, category, min_margin_percent, max_margin_percent, description } = req.body;
    const newAccountType = {
      tenant_id: req.tenant_id,
      account_type_name,
      category,
      min_margin_percent,
      max_margin_percent,
      description,
    };

    db.query('INSERT INTO ro_cpq.account_types SET ?', newAccountType, (err, result) => {
      if (err) {
        console.error('[ERROR] DB error during creating account type:', err);
        return res.status(500).json({ success: false, message: 'DB error' });
      }
      res.json({ success: true, account_type_id: result.insertId });
    });
  });

  // Update an account type (guard by tenant)
  router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { account_type_name, category, min_margin_percent, max_margin_percent, description } = req.body;
    const updatedAccountType = {
      account_type_name,
      category,
      min_margin_percent,
      max_margin_percent,
      description,
    };

    db.query(
      'UPDATE ro_cpq.account_types SET ? WHERE tenant_id = ? AND account_type_id = ?',
      [updatedAccountType, req.tenant_id, id],
      (err) => {
        if (err) {
          console.error('[ERROR] DB error during updating account type:', err);
          return res.status(500).json({ success: false, message: 'DB error' });
        }
        res.json({ success: true });
      }
    );
  });

  // Delete an account type (guard by tenant)
  router.delete('/:id', (req, res) => {
    const { id } = req.params;
    db.query(
      'DELETE FROM ro_cpq.account_types WHERE tenant_id = ? AND account_type_id = ?',
      [req.tenant_id, id],
      (err) => {
        if (err) {
          console.error('[ERROR] DB error during deleting account type:', err);
          return res.status(500).json({ success: false, message: 'DB error' });
        }
        res.json({ success: true });
      }
    );
  });

  return router;
};
