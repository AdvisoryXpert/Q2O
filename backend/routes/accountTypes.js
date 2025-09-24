// routes/accountTypes.js
const express = require('express');
const router = express.Router();

const DEBUG = process.env.DEBUG_ACCOUNTS === '1';
const dlog = (...args) => DEBUG && console.log('[account-types]', ...args);

module.exports = (db) => {
  // GET /api/account-types?category=...
  router.get('/', (req, res) => {
    const rawCategory = req.query.category;
    const category = typeof rawCategory === 'string' ? rawCategory.trim() : undefined;

    let query = 'SELECT * FROM ro_cpq.account_types WHERE tenant_id = ?';
    const params = [req.tenant_id];

    if (category && category.length > 0) {
      // exact match (current behavior). To use partial match, switch to the LIKE block below.
      query += ' AND category = ?';
      params.push(category);

      // --- OPTIONAL: partial match ---
      // query += ' AND category LIKE ?';
      // params.push(`%${category}%`);
    }

    dlog('GET /account-types',
      { tenant_id: req.tenant_id, rawCategory, category, sql: query, params });

    const t0 = Date.now();
    db.query(query, params, (err, results) => {
      const ms = Date.now() - t0;

      if (err) {
        console.error('[ERROR] DB error during fetching account types:', err);
        return res.status(500).json({ success: false, message: 'DB error' });
      }

      dlog('RESULT', { count: Array.isArray(results) ? results.length : 0, ms });
      res.json(results);
    });
  });

  // POST /api/account-types
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

    dlog('POST /account-types', { tenant_id: req.tenant_id, body: req.body });

    db.query('INSERT INTO ro_cpq.account_types SET ?', newAccountType, (err, result) => {
      if (err) {
        console.error('[ERROR] DB error during creating account type:', err);
        return res.status(500).json({ success: false, message: 'DB error' });
      }
      dlog('INSERTED', { insertId: result.insertId });
      res.json({ success: true, account_type_id: result.insertId });
    });
  });

  // PUT /api/account-types/:id
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

    dlog('PUT /account-types/:id', { id, tenant_id: req.tenant_id, body: req.body });

    db.query(
      'UPDATE ro_cpq.account_types SET ? WHERE tenant_id = ? AND account_type_id = ?',
      [updatedAccountType, req.tenant_id, id],
      (err, result) => {
        if (err) {
          console.error('[ERROR] DB error during updating account type:', err);
          return res.status(500).json({ success: false, message: 'DB error' });
        }
        dlog('UPDATED', { affectedRows: result?.affectedRows });
        res.json({ success: true });
      }
    );
  });

  // DELETE /api/account-types/:id
  router.delete('/:id', (req, res) => {
    const { id } = req.params;
    dlog('DELETE /account-types/:id', { id, tenant_id: req.tenant_id });

    db.query(
      'DELETE FROM ro_cpq.account_types WHERE tenant_id = ? AND account_type_id = ?',
      [req.tenant_id, id],
      (err, result) => {
        if (err) {
          console.error('[ERROR] DB error during deleting account type:', err);
          return res.status(500).json({ success: false, message: 'DB error' });
        }
        dlog('DELETED', { affectedRows: result?.affectedRows });
        res.json({ success: true });
      }
    );
  });

  return router;
};
