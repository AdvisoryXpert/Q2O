// dealers.js
const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  // GET all dealers (tenant)
  router.get('/', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const countQuery = 'SELECT COUNT(*) as count FROM ro_cpq.dealer WHERE tenant_id = ?';
    db.query(countQuery, [req.tenant_id], (err, countResult) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const totalRows = countResult[0].count;

      const dataQuery = 'SELECT * FROM ro_cpq.dealer WHERE tenant_id = ? ORDER BY dealer_id DESC LIMIT ? OFFSET ?';
      db.query(dataQuery, [req.tenant_id, pageSize, offset], (err, results) => {
        if (err) {
          console.error('DB Error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        db.query('SELECT dealer_id, alt_phone FROM ro_cpq.dealer_phone WHERE dealer_id IN (?)', [results.map(d => d.dealer_id)], (err, altPhones) => {
          if (err) {
            console.error('Alternate Phone Fetch Error:', err);
            return res.status(500).json({ error: 'Failed to fetch alternate phones' });
          }

          const dealersWithAltPhones = results.map(dealer => ({
            ...dealer,
            alternate_phones: altPhones.filter(p => p.dealer_id === dealer.dealer_id).map(p => p.alt_phone)
          }));

          res.json({ rows: dealersWithAltPhones, totalRows });
        });
      });
    });
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

      const dealer = results[0];

      db.query('SELECT alt_phone FROM ro_cpq.dealer_phone WHERE dealer_id = ?', [id], (err, altPhones) => {
        if (err) {
          console.error('Alternate Phone Fetch Error:', err);
          return res.status(500).json({ error: 'Failed to fetch alternate phones' });
        }

        dealer.alternate_phones = altPhones.map(p => p.alt_phone);
        res.json(dealer);
      });
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

        const dealer_id = result.insertId;
        const { alternate_phones } = req.body;

        if (alternate_phones && alternate_phones.length > 0) {
          const alternatePhonesValues = alternate_phones.map(alt_phone => [dealer_id, alt_phone]);
          db.query(
            'INSERT INTO ro_cpq.dealer_phone (dealer_id, alt_phone) VALUES ?',
            [alternatePhonesValues],
            (err) => {
              if (err) {
                console.error('Alternate Phone Insert Error:', err);
                // Even if alternate phones fail, the dealer is created.
                // Decide on your error handling strategy: rollback or just warn.
              }
            }
          );
        }

        res.json({ dealer_id });
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

        const { alternate_phones } = req.body;

        db.query('DELETE FROM ro_cpq.dealer_phone WHERE dealer_id = ?', [id], (err) => {
          if (err) {
            console.error('Alternate Phone Delete Error:', err);
            return res.status(500).json({ error: 'Failed to update alternate phones' });
          }

          if (alternate_phones && alternate_phones.length > 0) {
            const alternatePhonesValues = alternate_phones.map(alt_phone => [id, alt_phone]);
            db.query(
              'INSERT INTO ro_cpq.dealer_phone (dealer_id, alt_phone) VALUES ?',
              [alternatePhonesValues],
              (err) => {
                if (err) {
                  console.error('Alternate Phone Insert Error:', err);
                  return res.status(500).json({ error: 'Failed to insert alternate phones' });
                }
              }
            );
          }

          res.json({ message: 'Dealer updated successfully' });
        });
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

  // GET tenant by ID
  router.get('/tenant/:id', (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Tenant ID is required" });

    const query = 'SELECT name as tenant_name, email as tenant_email, phone as tenant_phone, address as tenant_address, gstin as tenant_gstin, cin as tenant_cin FROM ro_cpq.tenants WHERE tenant_id = ?';
    db.query(query, [id], (err, results) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      res.json(results[0]);
    });
  });

  // GET user by ID
  router.get('/user/:id', (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "User ID is required" });

    const query = 'SELECT full_name, email, phone FROM ro_cpq.users WHERE user_id = ?';
    db.query(query, [id], (err, results) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(results[0]);
    });
  });

  return router;
};
