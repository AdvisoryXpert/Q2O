const express = require('express');
const router = express.Router();
const db = require('../db'); // adjust the path as needed

router.get('/test', (req, res) => {
  res.json({ message: 'Attributes route working fine ✅' });
});

// Get attributes by product ID
router.get('/:product_id', (req, res) => {
  const { product_id } = req.params;

  db.query(
    `SELECT attr.attribute_id, attr.product_id, attr.name, prc.price FROM 
ro_cpq.product_attribute attr , ro_cpq.product_pricing prc WHERE attr.product_id = ?
and prc.attribute_id=attr.attribute_id order by attr.attribute_id asc;`,
    [product_id],
    (err, results) => {
      if (err) {
        console.error('Error fetching attributes:', err);
        return res.status(500).json({ error: 'Failed to fetch attributes' });
      }

      //console.log('Fetched attributes:', results); // debug output
      res.json(results);
    }
  );
});

module.exports = router;