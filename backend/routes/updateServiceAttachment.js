const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');

// ✅ Add this temporary test route at the top
router.post('/test-upload', (req, res) => {
  console.log('✅ Test Upload hit!');
  console.log('📦 req.files:', req.files);
  console.log('📥 req.body:', req.body);

  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: 'No file received' });
  }

  res.json({
    success: true,
    message: 'Test upload successful',
    filename: req.files.file.name,
    mimetype: req.files.file.mimetype,
    size: req.files.file.size,
  });
});

// ✅ Post /api/service-requests/:id/attachment
router.post('/:id/attachment', async (req, res) => {
  const { id } = req.params;

  console.log('🟢 Upload triggered for ID:', id);
  console.log('🔍 req.files:', req.files);
  console.log('🔍 req.body:', req.body);
  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const file = req.files.file;
  const ext = path.extname(file.name);
  const filename = `${id}-${Date.now()}${ext}`;
  const uploadDir = path.join(__dirname, '..', 'uploads', 'lr-receipts');

  // Ensure directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, filename);

  try {
    // Save file
    await file.mv(filePath);

    // Delete old file if exists
    db.query('SELECT file_path FROM service_requests WHERE id = ?', [id], (err, rows) => {
      if (!err && rows.length > 0 && rows[0].file_path) {
        const oldFile = path.join(uploadDir, rows[0].file_path);
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }
    });

    // Update DB
    db.query(
      'UPDATE service_requests SET file_path = ?, filename = ? WHERE id = ?',
      [filename, file.name, id],
      (err) => {
        if (err) {
          console.error('❌ DB update error:', err);
          return res.status(500).json({ error: 'Database update failed' });
        }

        return res.json({
          success: true,
          message: 'Upload successful',
          file_path: filename,
          filename: file.name,
        });
      }
    );
  } catch (err) {
    console.error('❌ File save failed:', err);
    return res.status(500).json({ error: 'Failed to save file' });
  }
});

module.exports = router;
