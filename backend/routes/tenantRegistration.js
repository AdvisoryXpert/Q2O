
const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const router = express.Router();

// --- Multer Configuration for Logo Uploads ---
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/logos/');
  },
  filename: (req, file, cb) => {
    // Create a unique filename to prevent overwrites
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: logoStorage,
  fileFilter: (req, file, cb) => {
    // Basic image file type validation
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image file.'), false);
    }
  }
}).fields([
  { name: 'logo', maxCount: 1 },
  { name: 'logo_dark', maxCount: 1 }
]);

// --- Helper function to generate a slug from a name ---
const generateSlug = (name) => {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
};

// --- Tenant and Admin User Registration Endpoint ---
// POST /api/tenants/register
router.post('/register', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const {
      name, plan_code, brand_primary_hex, brand_secondary_hex, metadata,
      full_name, email, password, phone
    } = req.body;

    if (!name || !plan_code || !full_name || !email || !password) {
      return res.status(400).json({ error: 'Tenant name, plan code, and user details are required.' });
    }

    db.getConnection((err, connection) => {
      if (err) {
        console.error('Error getting DB connection:', err);
        return res.status(500).json({ error: 'An internal server error occurred.' });
      }

      connection.beginTransaction((err) => {
        if (err) {
          connection.release();
          return res.status(500).json({ error: 'An internal server error occurred.' });
        }

        connection.query('SELECT plan_id FROM plans WHERE code = ?', [plan_code], (err, plans) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ error: 'An error occurred during registration.', details: err.message });
            });
          }

          if (plans.length === 0) {
            return connection.rollback(() => {
              connection.release();
              res.status(400).json({ error: 'Invalid plan code provided.' });
            });
          }

          const plan = plans[0];
          const billing_customer_id = `cus_${uuidv4()}`;
          const logo_url = req.files && req.files['logo'] ? req.files['logo'][0].path : null;
          const logo_dark_url = req.files && req.files['logo_dark'] ? req.files['logo_dark'][0].path : null;

          const newTenant = {
            name,
            slug: generateSlug(name),
            status: 'active',
            plan_id: plan.plan_id,
            trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            billing_customer_id,
            logo_url,
            logo_dark_url,
            logo_version: logo_url || logo_dark_url ? 1 : 0,
            brand_primary_hex: brand_primary_hex || null,
            brand_secondary_hex: brand_secondary_hex || null,
            metadata: metadata ? JSON.stringify(metadata) : null,
          };

          connection.query('INSERT INTO tenants SET ?', newTenant, (err, tenantResult) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ error: 'An error occurred during registration.', details: err.message });
              });
            }

            const tenant_id = tenantResult.insertId;
            const firstDayOfMonth = new Date().toISOString().slice(0, 8) + '01';

            connection.query('INSERT INTO tenant_usage_monthly (tenant_id, month, quotes_used) VALUES (?, ?, ?)', [tenant_id, firstDayOfMonth, 0], (err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).json({ error: 'An error occurred during registration.', details: err.message });
                });
              }

              bcrypt.genSalt(10, (err, salt) => {
                if (err) {
                    return connection.rollback(() => { connection.release(); res.status(500).json({ error: 'An error occurred during registration.' }); });
                }
                bcrypt.hash(password, salt, (err, password_hash) => {
                  if (err) {
                    return connection.rollback(() => { connection.release(); res.status(500).json({ error: 'An error occurred during registration.' }); });
                  }

                  const newUser = {
                    tenant_id,
                    full_name,
                    email,
                    phone: phone || null,
                    password_hash,
                    role: 'Admin',
                    two_fa_enabled: false,
                    can_regenerate_2fa: true
                  };

                  connection.query('INSERT INTO users SET ?', newUser, (err, userResult) => {
                    if (err) {
                      return connection.rollback(() => {
                        connection.release();
                        if (err.code === 'ER_DUP_ENTRY') {
                            return res.status(409).json({ error: 'An account with this email already exists.' });
                        }
                        res.status(500).json({ error: 'An error occurred during registration.', details: err.message });
                      });
                    }

                    connection.commit((err) => {
                      if (err) {
                        return connection.rollback(() => {
                          connection.release();
                          res.status(500).json({ error: 'An error occurred during registration.', details: err.message });
                        });
                      }

                      connection.release();
                      res.status(201).json({
                        message: 'Tenant and Admin User registered successfully!',
                        tenant: { tenant_id, ...newTenant },
                        user: { user_id: userResult.insertId, ...newUser }
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

module.exports = router;
