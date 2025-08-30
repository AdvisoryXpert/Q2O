const express = require('express');
const router = express.Router();
const db = require('../db'); // adjust path as needed

// Get note by quote ID
router.get('/:quote_id', (req, res) => {
  const { quote_id } = req.params;

  db.query(
    'SELECT note_id, quote_id, content, created_at FROM notes WHERE quote_id = ? ORDER BY created_at DESC',
    [quote_id],
    (err, results) => {
      if (err) {
        console.error('Error fetching notes:', err);
        return res.status(500).json({ error: 'Failed to fetch notes' });
      }

      // Convert Buffer to string if necessary
      const processed = results.map(note => ({
        ...note,
        note_text: note.content?.toString('utf8') || '',
      }));

      res.json(processed);
    }
  );
});
  

// Create or update note
router.post('/:quoteId', async (req, res) => {
    const { quoteId } = req.params;
    const { content } = req.body;
  
    try {
      const result = await db.query('SELECT * FROM notes WHERE quote_id = ?', [quoteId]);
      
      const rows = Array.isArray(result) ? result[0] : []; // ✅ fallback in case query result is unexpected
  
      if (Array.isArray(rows) && rows.length > 0) {
        await db.query(
          'UPDATE notes SET content = ? WHERE quote_id = ?',
          [content, quoteId]
        );
      } else {
        await db.query(
          'INSERT INTO notes (quote_id, content) VALUES (?, ?)',
          [quoteId, content]
        );
      }
  
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving note:', error);
      res.status(500).json({ error: 'Failed to save note' });
    }
  });

module.exports = router;