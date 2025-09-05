const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');

/* =========================
   WATER CONDITION APIs
   ========================= */

// GET all conditions (tenant)
router.get('/conditions', (req,res) => {
  db.query('SELECT * FROM ro_cpq.water_condition WHERE tenant_id = ?', [req.tenant_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// POST new condition (stamp tenant)
router.post('/conditions', (req, res) => {
  const { tds_min, tds_max, hardness_min, hardness_max } = req.body;
  db.query(
    `INSERT INTO ro_cpq.water_condition (tenant_id, tds_min, tds_max, hardness_min, hardness_max)
     VALUES (?, ?, ?, ?, ?)`,
    [req.tenant_id, tds_min, tds_max, hardness_min, hardness_max],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId });
    }
  );
});

// PUT update condition (guard by tenant)
router.put('/conditions/:id', (req, res) => {
  const { id } = req.params;
  const { tds_min, tds_max, hardness_min, hardness_max } = req.body;
  db.query(
    `UPDATE ro_cpq.water_condition 
     SET tds_min = ?, tds_max = ?, hardness_min = ?, hardness_max = ?
     WHERE condition_id = ? AND tenant_id = ?`,
    [tds_min, tds_max, hardness_min, hardness_max, id, req.tenant_id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Condition updated' });
    }
  );
});

// DELETE condition (guard by tenant)
router.delete('/conditions/:id', (req, res) => {
  db.query('DELETE FROM ro_cpq.water_condition WHERE condition_id = ? AND tenant_id = ?',
    [req.params.id, req.tenant_id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Condition deleted' });
    }
  );
});

/* =========================
   PRODUCTS APIs
   ========================= */

// POST new product (stamp tenant)
router.post('/products', (req, res) => {
  const { name, condition_id } = req.body;
  db.query(
    `INSERT INTO ro_cpq.product (tenant_id, name, condition_id) VALUES (?, ?, ?)`,
    [req.tenant_id, name, condition_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId });
    }
  );
});

// PUT update product (guard by tenant)
router.put('/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, condition_id } = req.body;
  db.query(
    `UPDATE ro_cpq.product SET name = ?, condition_id = ?
     WHERE product_id = ? AND tenant_id = ?`,
    [name, condition_id, id, req.tenant_id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Product updated' });
    }
  );
});

// DELETE product (guard by tenant)
router.delete('/products/:id', (req, res) => {
  db.query('DELETE FROM ro_cpq.product WHERE product_id = ? AND tenant_id = ?',
    [req.params.id, req.tenant_id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Product deleted' });
    }
  );
});

/* =========================
   PRODUCT ATTRIBUTES APIs
   ========================= */

// POST new attribute (stamp tenant)
router.post('/product-attributes', (req, res) => {
  const { product_id, name, warranty_period } = req.body;
  db.query(
    `INSERT INTO ro_cpq.product_attribute (tenant_id, product_id, name, warranty_period)
     VALUES (?, ?, ?, ?)`,
    [req.tenant_id, product_id, name, warranty_period],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId });
    }
  );
});

// PUT update attribute (guard by tenant)
router.put('/product-attributes/:id', (req, res) => {
  const { id } = req.params;
  const { name, warranty_period } = req.body;
  db.query(
    `UPDATE ro_cpq.product_attribute
     SET name = ?, warranty_period = ?
     WHERE attribute_id = ? AND tenant_id = ?`,
    [name, warranty_period, id, req.tenant_id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Attribute updated' });
    }
  );
});

// DELETE attribute (guard by tenant)
router.delete('/product-attributes/:id', (req, res) => {
  db.query('DELETE FROM ro_cpq.product_attribute WHERE attribute_id = ? AND tenant_id = ?',
    [req.params.id, req.tenant_id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Attribute deleted' });
    }
  );
});

// Get products by condition_id (tenant)
router.get('/products', (req, res) => {
  const { condition_id } = req.query;
  if (!condition_id) return res.status(400).json({ error: 'condition_id is required' });

  db.query(
    'SELECT * FROM ro_cpq.product WHERE condition_id = ? AND tenant_id = ?',
    [condition_id, req.tenant_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Get attributes by product_id (tenant)
router.get('/product-attributes', (req, res) => {
  const { product_id } = req.query;
  if (!product_id) return res.status(400).json({ error: 'product_id is required' });

  db.query(
    'SELECT * FROM ro_cpq.product_attribute WHERE product_id = ? AND tenant_id = ?',
    [product_id, req.tenant_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Upload image (tenant-safe lookups + guard on UPDATE)
router.post('/product-attributes/:id/upload-image', (req, res) => {
  const { id } = req.params;
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const imageFile = req.files.image;

  db.query(
    `SELECT p.name, p.condition_id 
       FROM ro_cpq.product_attribute pa 
       JOIN ro_cpq.product p 
         ON pa.product_id = p.product_id 
        AND pa.tenant_id = p.tenant_id
      WHERE pa.attribute_id = ? AND pa.tenant_id = ?`,
    [id, req.tenant_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).send('Product not found');

      const productName = results[0].name;
      const conditionId = results[0].condition_id;
      const dir = path.join(__dirname, `../uploads/product_attribute/${productName}_${conditionId}`);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const imagePath = path.join(dir, `${Date.now()}_${imageFile.name}`);
      const imageUrl = `/${path.relative(path.join(__dirname, '../'), imagePath)}`;

      imageFile.mv(imagePath, (err) => {
        if (err) return res.status(500).send(err);

        db.query(
          'UPDATE ro_cpq.product_attribute SET image_url = ? WHERE attribute_id = ? AND tenant_id = ?',
          [imageUrl, id, req.tenant_id],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ imageUrl });
          }
        );
      });
    }
  );
});

// Upload specification (tenant-safe)
router.post('/product-attributes/:id/upload-specification', (req, res) => {
  const { id } = req.params;
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const specificationFile = req.files.specification;

  db.query(
    `SELECT p.name, p.condition_id 
       FROM ro_cpq.product_attribute pa 
       JOIN ro_cpq.product p 
         ON pa.product_id = p.product_id 
        AND pa.tenant_id = p.tenant_id
      WHERE pa.attribute_id = ? AND pa.tenant_id = ?`,
    [id, req.tenant_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).send('Product not found');

      const productName = results[0].name;
      const conditionId = results[0].condition_id;
      const dir = path.join(__dirname, `../uploads/product_attribute/${productName}_${conditionId}`);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const specificationPath = path.join(dir, `${Date.now()}_${specificationFile.name}`);
      const specificationUrl = `/${path.relative(path.join(__dirname, '../'), specificationPath)}`;

      specificationFile.mv(specificationPath, (err) => {
        if (err) return res.status(500).send(err);

        db.query(
          'UPDATE ro_cpq.product_attribute SET specification_url = ? WHERE attribute_id = ? AND tenant_id = ?',
          [specificationUrl, id, req.tenant_id],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ specificationUrl });
          }
        );
      });
    }
  );
});

module.exports = router;