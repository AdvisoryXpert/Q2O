const express = require('express');
const router = express.Router();

module.exports = (db) => {
  router.get('/', (req, res) => {
    const tenant_id = req.tenant_id;
    const query = `
      SELECT 
      pa.product_id,
      p.name AS product_name,
      pa.attribute_id,
      pa.name AS attribute_name,
      prc.price
      FROM ro_cpq.product_attribute pa
      JOIN ro_cpq.product p ON pa.product_id = p.product_id
      JOIN ro_cpq.product_pricing prc ON prc.attribute_id = pa.attribute_id
      WHERE pa.tenant_id = ?;
      `;

    db.query(query, [tenant_id], (err, rows) => {
      if (err) {
        console.error("Error fetching product attributes:", err);
        return res.status(500).json({ error: "Database error" });
      }

      // Group attributes by attribute_id
      const attributeMap = {};

      rows.forEach(row => {
        if (!attributeMap[row.attribute_id]) {
          attributeMap[row.attribute_id] = {
            product_id: row.product_id,
            product_name: row.product_name,
            attribute_id: row.attribute_id,
            attributes: {},
            attribute_name: '', // placeholder to save any of the attribute names
          };
        }

        // Store attributes (like brand, price)
        attributeMap[row.attribute_id].attributes[row.attribute_name] = row.value;

        // Optionally store one of the attribute names (e.g., for variant label)
        if (!attributeMap[row.attribute_id].attribute_name) {
          attributeMap[row.attribute_id].attribute_name = row.attribute_name;
        }
      });

      // Flatten into usable POS format
      const products = Object.values(attributeMap).map(p => ({
        product_id: p.product_id,
        product_name: p.product_name,
        product_attribute_id: p.attribute_id,
        product_attribute_name: p.attribute_name,
        brand: p.attributes['brand'] || '',
        price: parseFloat(p.attributes['price']) || 0
      }));

      res.json(products);
    });
  });

  // GET /api/attributes - fetch all attributes
router.get('/attr', (req, res) => {
  const { attribute_id } = req.query;
  const tenant_id = req.tenant_id;

  if (!attribute_id) {
    return res.status(400).json({ error: 'attribute_id is required' });
  }

  const sql = `SELECT * FROM ro_cpq.product_attribute WHERE attribute_id = ? AND tenant_id = ?`;
  const params = [Number(attribute_id), tenant_id];

  console.log('SQL:', sql, 'Params:', params);

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('GET attributes failed', err);
      return res.status(500).json({ error: 'Failed to fetch attributes' });
    }
    res.json(results);
  });
});
  return router;
};