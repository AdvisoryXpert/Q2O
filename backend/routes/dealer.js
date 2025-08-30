// dealers.js
const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  // GET all dealers
  router.get('/', (req, res) => {
    db.query('SELECT * FROM dealer', (err, results) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results);
    });
  });

  // GET dealer by ID
  router.get('/:id', (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "Dealer ID is required" });
    }

    const query = 'SELECT * FROM ro_cpq.dealer WHERE dealer_id = ?';
    db.query(query, [id], (err, results) => {
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

// GET dealer by phone
router.get('/by-phone/:phone', (req, res) => {
  console.log("Incoming Params:", req.params); // Log here
  const { phone } = req.params;

  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  const query = 'SELECT * FROM ro_cpq.dealer WHERE phone = ?';
  db.query(query, [phone], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

  // POST a new dealer
  
  router.post('/', (req, res) => {
    const { full_name, location, email, phone,gst_number, is_important = false } = req.body;

    db.query(
      `INSERT INTO dealer (full_name, location, email, phone,gst_number, date_created, is_important)
       VALUES (?, ?, ?, ?,?, NOW(), ?)`,
      [full_name, location, email, phone,gst_number, is_important],
      (err, result) => {
        if (err) {
          console.error('Insert Error:', err);
          return res.status(500).json({ error: 'Insert failed' });
        }
        res.json({ dealer_id: result.insertId });
      }
    );
  });

  // PUT to update dealer by ID
  router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { full_name, location, email, phone,gst_number, account_type,is_important } = req.body;

    db.query(
      `UPDATE dealer 
       SET full_name = ?, location = ?, email = ?, phone = ?,gst_number = ?, account_type= ?, is_important = ?
       WHERE dealer_id = ?`,
      [full_name, location, email, phone,gst_number, account_type, is_important, id],
      (err, result) => {
        if (err) {
          console.error('Update Error:', err);
          return res.status(500).json({ error: 'Update failed' });
        }
        res.json({ message: 'Dealer updated successfully' });
      }
    );
  });

  // DELETE dealer by ID
  router.delete('/:id', (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM dealer WHERE dealer_id = ?', [id], (err, result) => {
      if (err) {
        console.error('Delete Error:', err);
        return res.status(500).json({ error: 'Delete failed' });
      }
      res.json({ message: 'Dealer deleted successfully' });
    });
  });

  // GET quotation count for a dealer
  router.get('/:id/quotations/count', (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "Dealer ID is required" });
    }

    const query = 'SELECT COUNT(*) as quotationCount FROM ro_cpq.quotation WHERE dealer_id = ?';
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('DB Error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results[0]);
    });
  });

  return router;
};
