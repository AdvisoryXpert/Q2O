// lrReceipts.js
const express = require('express');
const createFollowup = require('./CreateFollowup');
module.exports = function (db) {
  const router = express.Router();

  // Fetch all LR Receipts
  router.get('/', (req, res) => {
    db.query('SELECT * FROM lr_receipts', (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(results);
    });
  });

  // Create a new LR Receipt (now includes user_id)

  router.post('/', (req, res) => {
    const { lr_number, product_name, manufacturer_name, description, status, executive, phone, user_id } = req.body;

    db.query(
      `INSERT INTO lr_receipts 
      (lr_number, product_name, manufacturer_name, description, status, executive, phone, user_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [lr_number, product_name, manufacturer_name, description, status, executive, phone, user_id],
      (err, result) => {
        if (err) {
          console.error('Insert Error:', err);
          return res.status(500).json({ error: 'Insert failed' });
        }
        // ✅ Create follow-up for the LR record
        createFollowup('lr', result.insertId, user_id, user_id);
        res.json({ id: result.insertId });
      }
    );
  });
 
  // Update existing LR Receipt
  router.put('/:id', (req, res) => {
    const { lr_number, product_name, manufacturer_name, description, status, executive, phone, user_id } = req.body;
    const id = parseInt(req.params.id, 10);

    db.query(
      `UPDATE lr_receipts 
       SET lr_number=?, product_name=?, manufacturer_name=?, description=?, status=?, executive=?, phone=?, user_id=? 
       WHERE id=?`,
      [lr_number, product_name, manufacturer_name, description, status, executive, phone, user_id, id],
      (err, result) => {
        if (err) {
          console.error('Update Error:', err);
          return res.status(500).json({ error: 'Update failed' });
        }
        res.json({ message: 'Record updated successfully' });
      }
    );
  });

  // Get single LR Receipt by ID
  router.get('/:id', (req, res) => {
    db.query('SELECT * FROM lr_receipts WHERE id = ?', [req.params.id], (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(results[0]);
    });
  });

  router.put('/:id/attachment', (req, res) => {
    console.log('📥 Upload endpoint HIT');
  
    if (!req.files) {
      console.log('❌ req.files is undefined');
      return res.status(400).json({ error: 'No file uploaded – req.files missing' });
    }
  
    if (!req.files.file) {
      console.log('❌ req.files.file is missing');
      return res.status(400).json({ error: 'No file uploaded – "file" field missing' });
    }
  
    const file = req.files.file;
    console.log('✅ File received:', file.name);
  
    const fileName = `${Date.now()}_${file.name}`;
    const savePath = `./uploads/lr-receipts/${fileName}`;
  
    file.mv(savePath, (err) => {
      if (err) {
        console.log('❌ Error saving file:', err);
        return res.status(500).json({ error: 'File upload failed' });
      }
  
      db.query(
        'UPDATE lr_receipts SET file_path = ? WHERE id = ?',
        [fileName, req.params.id],
        (err) => {
          if (err) {
            console.log('❌ DB update failed:', err);
            return res.status(500).json({ error: 'Database update failed' });
          }
          console.log('✅ File saved and DB updated.');
          res.json({ message: 'File uploaded', fileName });
        }
      );
    });
  });  

  return router;
};
