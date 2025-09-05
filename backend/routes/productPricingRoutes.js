const express = require('express');
const router = express.Router();
const db = require('../db');

// GET: Fetch pricing records with joins
router.get('/', (req, res) => {
  const { attribute_id, condition_id, product_id } = req.query;
  const tenant_id = req.tenant_id;

  db.query(
    `SELECT 
       ppr.*, 
       pa.name AS attribute_name, 
       pr.name AS product_name, 
       pr.condition_id
     FROM ro_cpq.product_pricing ppr
     JOIN ro_cpq.product_attribute pa ON ppr.attribute_id = pa.attribute_id
     JOIN ro_cpq.product pr ON pa.product_id = pr.product_id
     WHERE (? IS NULL OR ppr.attribute_id = ?)
       AND (? IS NULL OR pr.condition_id = ?)
       AND (? IS NULL OR pr.product_id = ?)
       AND ppr.tenant_id = ?`,
    [
      attribute_id || null, attribute_id || null,
      condition_id || null, condition_id || null,
      product_id || null, product_id || null,
      tenant_id
    ],
    (err, results) => {
      if (err) {
        console.error('GET pricing failed', err);
        return res.status(500).json({ error: 'Failed to fetch pricing records' });
      }
      res.json(results);
    }
  );
});

router.post('/', async (req, res) => {
  const { attribute_id, min_quantity, cost_price, price } = req.body;
  const tenant_id = req.tenant_id;

  // 1. Input validation
  if (!attribute_id || min_quantity == null || price == null || cost_price == null) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      received: req.body
    });
  }

  try {
    // 2. Verify attribute exists (using callback style to be safe)
    db.query(
      `SELECT pa.attribute_id, pa.product_id, p.condition_id
       FROM ro_cpq.product_attribute pa
       LEFT JOIN ro_cpq.product p ON pa.product_id = p.product_id
       WHERE pa.attribute_id = ? AND pa.tenant_id = ?`,
      [attribute_id, tenant_id],
      (err, attributeResults) => {
        if (err) {
          console.error('Attribute query failed', err);
          return res.status(500).json({ error: 'Database query failed' });
        }

        if (attributeResults.length === 0) {
          return res.status(400).json({ error: `Attribute ID ${attribute_id} not found` });
        }

        const attribute = attributeResults[0];

        // 3. Check for existing pricing
        db.query(
          `SELECT 1 FROM ro_cpq.product_pricing
           WHERE attribute_id = ? AND tenant_id = ?`,
          [attribute_id, tenant_id],
          (err, existingResults) => {
            if (err) {
              console.error('Existing pricing check failed', err);
              return res.status(500).json({ error: 'Database query failed' });
            }

            if (existingResults.length > 0) {
              return res.status(400).json({
                    error: {
                      message: 'Pricing already exists for this attribute',
                      type: 'DUPLICATE_PRICING'}
              });
            }

            // 4. Create new pricing record
            db.query(
              `INSERT INTO ro_cpq.product_pricing 
               (attribute_id, min_quantity, cost_price, price, tenant_id)
               VALUES (?, ?, ?, ?, ?)`,
              [attribute_id, min_quantity, cost_price, price, tenant_id],
              (err, result) => {
                if (err) {
                  console.error('Create pricing failed', err);
                  return res.status(500).json({ 
                    error: 'Failed to create pricing',
                    details: err.message
                  });
                }

                res.json({ 
                  success: true,
                  pricing_id: result.insertId,
                  product_id: attribute.product_id,
                  condition_id: attribute.condition_id
                });
              }
            );
          }
        );
      }
    );
  } catch (err) {
    console.error('Unexpected error', err);
    res.status(500).json({ 
      error: 'Unexpected server error',
      details: err.message
    });
  }
});
// PUT: Update existing pricing record
router.put('/:pricing_id', (req, res) => {
  const { pricing_id } = req.params;
  const { min_quantity, cost_price, price } = req.body;
  const tenant_id = req.tenant_id;

  if (!pricing_id) {
    return res.status(400).json({ error: 'Missing pricing_id' });
  }

  db.query(
    `UPDATE ro_cpq.product_pricing
     SET min_quantity = ?,
         cost_price = ?,
         price = ?
     WHERE pricing_id = ? AND tenant_id = ?`,
    [min_quantity, cost_price, price, pricing_id, tenant_id],
    (err, result) => {
      if (err) {
        console.error('PUT pricing failed', err);
        return res.status(500).json({ error: 'Failed to update pricing record' });
      }
      res.json({ message: 'Pricing updated' });
    }
  );
});

// DELETE: Remove pricing record
router.delete('/:pricing_id', (req, res) => {
  const { pricing_id } = req.params;
  const tenant_id = req.tenant_id;

  if (!pricing_id) {
    return res.status(400).json({ error: 'Missing pricing_id' });
  }

  db.query(
    `DELETE FROM ro_cpq.product_pricing WHERE pricing_id = ? AND tenant_id = ?`,
    [pricing_id, tenant_id],
    (err, result) => {
      if (err) {
        console.error('DELETE pricing failed', err);
        return res.status(500).json({ error: 'Failed to delete pricing record' });
      }
      res.json({ message: 'Pricing deleted' });
    }
  );
});

module.exports = router;