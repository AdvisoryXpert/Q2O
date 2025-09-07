const express = require('express');
const router = express.Router();
const db = require('../db'); // adjust the path as needed

router.get('/test', (req, res) => {
  res.json({ message: 'Attributes route working fine ✅' });
});

// Get recent orders
router.get('/', (req, res) => {
    const tenant_id = req.tenant_id;
    db.query('SELECT * FROM orders WHERE tenant_id = ? order by date_created desc', [tenant_id], (err, results) => {
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
  const tenant_id = req.tenant_id;

  db.query('SELECT * FROM orders WHERE order_id = ? AND tenant_id = ?', [orderId, tenant_id], (err, results) => {
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

// Get orders from the last month
router.get('/last-month', (req, res) => {
    const tenant_id = req.tenant_id;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    db.query('SELECT * FROM orders WHERE tenant_id = ? AND date_created >= ? order by date_created desc', [tenant_id, oneMonthAgo], (err, results) => {
        if (err) {
            console.error('DB Error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

module.exports = router;