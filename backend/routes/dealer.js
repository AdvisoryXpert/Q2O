const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  // ✅ GET all dealers (tenant) with pagination + KAM info
  router.get('/', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const { kam } = req.query;

    let countQuery = 'SELECT COUNT(*) as count FROM ro_cpq.dealer WHERE tenant_id = ?';
    const countParams = [req.tenant_id];
    if (kam) {
      if (kam === 'unassigned') {
        countQuery += ' AND account_manager_id IS NULL';
      } else {
        countQuery += ' AND account_manager_id = ?';
        countParams.push(kam);
      }
    }

    db.query(countQuery, countParams, (err, countResult) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      const totalRows = countResult[0].count;

      let dataQuery = `
        SELECT d.*, u.full_name AS account_manager_name, u.email AS account_manager_email
        FROM ro_cpq.dealer d
        LEFT JOIN ro_cpq.users u ON d.account_manager_id = u.user_id
        WHERE d.tenant_id = ?`;
      const dataParams = [req.tenant_id];
      if (kam) {
        if (kam === 'unassigned') {
          dataQuery += ' AND d.account_manager_id IS NULL';
        } else {
          dataQuery += ' AND d.account_manager_id = ?';
          dataParams.push(kam);
        }
      }
      dataQuery += ' ORDER BY d.dealer_id DESC LIMIT ? OFFSET ?';
      dataParams.push(pageSize, offset);

      db.query(dataQuery, dataParams, (err, dealers) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (dealers.length === 0)
          return res.json({ rows: [], totalRows: 0 });

        const dealerIds = dealers.map(d => d.dealer_id);
        db.query(
          'SELECT dealer_id, alt_phone FROM ro_cpq.dealer_phone WHERE dealer_id IN (?)',
          [dealerIds],
          (err, altPhones) => {
            if (err) return res.status(500).json({ error: 'Failed to fetch alternate phones' });

            const withAltPhones = dealers.map(d => ({
              ...d,
              alternate_phones: altPhones
                .filter(p => p.dealer_id === d.dealer_id)
                .map(p => p.alt_phone)
            }));

            res.json({ rows: withAltPhones, totalRows });
          }
        );
      });
    });
  });

  // ✅ GET dealer by ID with KAM info
  router.get('/:id', (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Dealer ID is required' });

    const query = `
      SELECT d.*, u.full_name AS account_manager_name, u.email AS account_manager_email
      FROM ro_cpq.dealer d
      LEFT JOIN ro_cpq.users u ON d.account_manager_id = u.user_id
      WHERE d.dealer_id = ? AND d.tenant_id = ?`;

    db.query(query, [id, req.tenant_id], (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length === 0) return res.status(404).json({ error: 'Dealer not found' });

      const dealer = results[0];

      db.query(
        'SELECT alt_phone FROM ro_cpq.dealer_phone WHERE dealer_id = ?',
        [id],
        (err, altPhones) => {
          if (err) return res.status(500).json({ error: 'Failed to fetch alternate phones' });

          dealer.alternate_phones = altPhones.map(p => p.alt_phone);
          res.json(dealer);
        }
      );
    });
  });

  // ✅ GET dealer by phone
  router.get('/by-phone/:phone', (req, res) => {
    const { phone } = req.params;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const query = `
      SELECT d.*, u.full_name AS account_manager_name, u.email AS account_manager_email
      FROM ro_cpq.dealer d
      LEFT JOIN ro_cpq.users u ON d.account_manager_id = u.user_id
      WHERE d.phone = ? AND d.tenant_id = ?`;

    db.query(query, [phone, req.tenant_id], (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(results);
    });
  });

  // ✅ POST a new dealer — auto-associate account_manager_id
  router.post('/', (req, res) => {
    const {
      full_name,
      location,
      email,
      phone,
      gst_number,
      is_important = false,
      account_type = null,
      alternate_phones = []
    } = req.body;

    const accountManagerId = req.user?.user_id || null; // logged-in user

    db.query(
      `INSERT INTO ro_cpq.dealer 
        (tenant_id, full_name, location, email, phone, gst_number, account_type, date_created, is_important, account_manager_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [req.tenant_id, full_name, location, email, phone, gst_number, account_type, is_important, accountManagerId],
      (err, result) => {
        if (err) {
          console.error('Insert Error:', err);
          return res.status(500).json({ error: 'Insert failed' });
        }

        const dealer_id = result.insertId;

        // Alternate phones
        if (alternate_phones.length > 0) {
          const values = alternate_phones.map(alt_phone => [dealer_id, alt_phone]);
          db.query(
            'INSERT INTO ro_cpq.dealer_phone (dealer_id, alt_phone) VALUES ?',
            [values],
            (err) => {
              if (err) console.error('Alternate Phone Insert Error:', err);
            }
          );
        }

        res.json({ dealer_id, account_manager_id: accountManagerId });
      }
    );
  });

  // ✅ PUT update dealer (includes account_manager_id)
  router.put('/:id', (req, res) => {
    const { id } = req.params;
    const {
      full_name,
      location,
      email,
      phone,
      gst_number,
      account_type,
      is_important,
      account_manager_id,
      alternate_phones = []
    } = req.body;

    db.query(
      `UPDATE ro_cpq.dealer 
       SET full_name=?, location=?, email=?, phone=?, gst_number=?, account_type=?, 
           is_important=?, account_manager_id=?
       WHERE dealer_id=? AND tenant_id=?`,
      [full_name, location, email, phone, gst_number, account_type, is_important, account_manager_id, id, req.tenant_id],
      (err) => {
        if (err) return res.status(500).json({ error: 'Update failed' });

        // Update alternate phones
        db.query('DELETE FROM ro_cpq.dealer_phone WHERE dealer_id = ?', [id], (err) => {
          if (err) return res.status(500).json({ error: 'Failed to update alternate phones' });

          if (alternate_phones.length > 0) {
            const values = alternate_phones.map(alt_phone => [id, alt_phone]);
            db.query(
              'INSERT INTO ro_cpq.dealer_phone (dealer_id, alt_phone) VALUES ?',
              [values],
              (err) => {
                if (err) return res.status(500).json({ error: 'Failed to insert alternate phones' });
              }
            );
          }

          res.json({ message: 'Dealer updated successfully' });
        });
      }
    );
  });

  // ✅ DELETE dealer (guard by tenant)
  router.delete('/:id', (req, res) => {
    const { id } = req.params;

    db.query(
      'DELETE FROM ro_cpq.dealer WHERE dealer_id = ? AND tenant_id = ?',
      [id, req.tenant_id],
      (err) => {
        if (err) return res.status(500).json({ error: 'Delete failed' });
        res.json({ message: 'Dealer deleted successfully' });
      }
    );
  });

  return router;
};
