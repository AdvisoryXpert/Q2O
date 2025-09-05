const express = require('express');
const router = express.Router();;
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db'); // adjust path as needed

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/lr-receipts/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.params.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Upload or update attachment for LR Receipt
router.put('/:id/attachment', upload.single('file'), (req, res) => {
  const { id } = req.params;
  const tenant_id = req.tenant_id;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Step 1: Check if the record exists
  db.query('SELECT file_path FROM lr_receipts WHERE id = ? AND tenant_id = ?', [id, tenant_id], (err, result) => {
    if (err) {
      console.error('DB Error:', err);
      fs.unlinkSync(req.file.path); // cleanup
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.length === 0) {
      fs.unlinkSync(req.file.path); // cleanup
      return res.status(404).json({ error: 'LR Receipt not found' });
    }

    const current = result[0];

    // Step 2: Delete the old file if it exists
    if (current.file_path) {
      const oldFilePath = path.join('uploads/lr-receipts', current.file_path);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Step 3: Update the database with new file path
    db.query(
      'UPDATE lr_receipts SET file_path = ? WHERE id = ? AND tenant_id = ?',
      [req.file.filename, id, tenant_id],
      (err) => {
        if (err) {
          console.error('Update Error:', err);
          fs.unlinkSync(req.file.path); // cleanup
          return res.status(500).json({ error: 'Failed to update attachment' });
        }

        res.json({
          success: true,
          message: 'File uploaded successfully',
          filePath: req.file.filename,
          url: `/uploads/lr-receipts/${req.file.filename}`
        });
      }
    );
  });
});
module.exports = router;