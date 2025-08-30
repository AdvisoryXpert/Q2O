const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // Get all account types
  router.get('/', (req, res) => {
    db.query('SELECT * FROM ro_cpq.account_types', (err, results) => {
      if (err) {
        console.error('[ERROR] DB error during fetching account types:', err);
        return res.status(500).json({ success: false, message: 'DB error' });
      }
      res.json(results);
    });
  });

  // Create a new account type
  router.post('/', (req, res) => {
    const { account_type_name, category, min_margin_percent, max_margin_percent, description } = req.body;
    const newAccountType = {
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

  // Update an account type
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

    db.query('UPDATE ro_cpq.account_types SET ? WHERE account_type_id = ?', [updatedAccountType, id], (err) => {
      if (err) {
        console.error('[ERROR] DB error during updating account type:', err);
        return res.status(500).json({ success: false, message: 'DB error' });
      }
      res.json({ success: true });
    });
  });

  // Delete an account type
  router.delete('/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM ro_cpq.account_types WHERE account_type_id = ?', id, (err) => {
      if (err) {
        console.error('[ERROR] DB error during deleting account type:', err);
        return res.status(500).json({ success: false, message: 'DB error' });
      }
      res.json({ success: true });
    });
  });

  return router;
};