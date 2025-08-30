const express = require('express');
const router = express.Router();
const db = require('../db'); // adjust the path as needed

router.get('/test', (req, res) => {
  res.json({ message: 'Attributes route working fine ✅' });
});

// Get recent orders
router.get('/', (req, res) => {
    db.query('SELECT * FROM orders order by date_created desc', (err, results) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results);
    });
  });

  // Get a specific order by orderId
router.get('/:orderId', (req, res) => {
  const orderId = req.params.orderId;

  db.query('SELECT * FROM orders WHERE order_id = ?', [orderId], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(results[0]); // assuming order_id is unique
  });
});

module.exports = router;