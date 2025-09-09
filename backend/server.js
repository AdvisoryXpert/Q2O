// node backend/server.js
require('dotenv').config({ path: '../.env' }); // 1) load env ASAP

const express = require('express');
const cors = require('cors');
const db = require('./db');
const path = require('path');
//const session = require('express-session');
const cookieParser = require('cookie-parser');
const verifyToken = require('./middleware/auth'); // JWT verify (sets req.user and req.tenant_id)
const fs = require('fs');
const https = require('https');
const http = require('http');

const app = express();

// ---- 2) CORS / parsers BEFORE auth ----
const corsOptions = {
  origin: ['http://127.0.0.1:3000', 'https://127.0.0.1:3000', 'http://192.168.1.73:3000'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'] // <— important for JWT header
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

app.set('trust proxy', 1);

// Static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/lr-receipts', express.static(path.join(__dirname, 'uploads/lr-receipts')));

// DB ping
db.getConnection((err, connection) => {
  if (err) {
    console.error('Database Connection Failed:', err);
    return;
  }
  console.log('MySQL Connected');
  connection.release();
});

const expressFileUpload = require('express-fileupload');

// ------------- 3) PUBLIC ROUTES (NO AUTH) -------------
const loginRouter = require('./routes/login')(db);
app.use('/api/login', loginRouter);

const logoutRouter = require('./routes/logout')();
app.use('/api/logout', logoutRouter);

const sessionRouter = require('./routes/session');
app.use('/api/session', sessionRouter);

const tenantRegistrationRouter = require('./routes/tenantRegistration');
app.use('/api/tenants', tenantRegistrationRouter);

const invitationsPublicRouter = require('./routes/invitationsPublic');
app.use('/api/invitations', invitationsPublicRouter);

// ------------- 4) PROTECT EVERYTHING ELSE UNDER /api -------------
app.use('/api', verifyToken);

// Activity logger AFTER auth so it can log req.user/req.tenant_id
const activityLogger = require('./middleware/activityLogger')(db);
app.use(activityLogger);

// ------------- 5) PROTECTED ROUTES -------------
// Keep everything under /api/* so verifyToken runs

// Invitations (Protected)
const invitationsRouter = require('./routes/invitations');
app.use('/api/admin/invitations', invitationsRouter);

// Account Types
const accountTypesRouter = require('./routes/accountTypes')(db);
app.use('/api/account-types', accountTypesRouter);

// LR Receipts
const lrReceiptsRouter = require('./routes/lrReceipts')(db);
app.use('/api/lr-receipts', expressFileUpload(), lrReceiptsRouter);
const updateAttachmentRouter = require('./routes/updateAttachment');
app.use('/api/lr-receipts', updateAttachmentRouter);

// Service Requests
const serviceUpload = require('./routes/updateServiceAttachment');
app.use('/api/service-requests', expressFileUpload(), serviceUpload);
const serviceRequestAPI = require('./routes/serviceRequestAPI');
app.use('/api/service-requests', serviceRequestAPI);

// Dealer
const dealerRouter = require('./routes/dealer')(db);
app.use('/api/dealers', dealerRouter);

// Dealer Quotation From POS Cart
const dealerQuotationFromCart = require('./routes/dealerQuotationFromCart')(db);
app.use('/api/dealer-quotation-from-cart', dealerQuotationFromCart);

// Dispatch (mobile)
const disptch_mob = require('./routes/getOrderDispatchdtls')(db);
app.use('/api/dipatch_mob', disptch_mob);

// Warranty & Dispatch Info
const warrantyRoutes = require('./routes/warrantyRoutes');
app.use('/api/warranty', warrantyRoutes);
const getDispatchInfoRoutes = require('./routes/getOrderDispatchInfo');
app.use('/api/dispatchOrders', getDispatchInfoRoutes);

// POS dispatch
const posDispatchRouter = require('./routes/pos_dispatch');
app.use('/api/orders_pos', posDispatchRouter);

// Notes
const notesRoutes = require('./routes/notes');
app.use('/api/notes', notesRoutes);

// Attributes
const attributeRoutes = require('./routes/attributes');
app.use('/api/attributes', attributeRoutes);

// Product Pricing
const productPricingRoutes = require('./routes/productPricingRoutes');
app.use('/api/product-pricing', productPricingRoutes);

// Product Admin
const productAdminRoutes = require('./routes/productAdminRoutes');
app.use('/api', productAdminRoutes);

// User / Role Mgmt
const userAccessRoutes = require('./routes/user_role_Access');
app.use('/api/userMgmt', userAccessRoutes(db));

// Quote→Order
const quotestoorderRoutes = require('./routes/quotestoorder');
app.use('/api/quotestoorder', quotestoorderRoutes);

// Followups
const followupsRouter = require('./routes/followups');
app.use('/api/followups', followupsRouter);

// Orders
const postoorderRoutes = require('./routes/orders');
app.use('/api/orders', postoorderRoutes);

// Product Attributes / Variants
const productAttributesRouter = require('./routes/Product_attributes')(db);
app.use('/api/product_attributes', productAttributesRouter);
const productvariantRouter = require('./routes/product_variants')(db);
app.use('/api/product_variants', productvariantRouter);

// Recent Orders
const recentOrders = require('./routes/recentorders');
app.use('/api/recentorders', recentOrders);

// Dispatch Orders
const dispatchOrders = require('./routes/dispatchOrders');
app.use('/api/dispatchorders', dispatchOrders(db));

// Reminders
const reminder = require('./routes/reminders')(db);
app.use('/api/reminders', reminder);

// Invoice
const updateInvoiceRoute = require("./routes/updateInvoice");
app.use("/api", updateInvoiceRoute);
const invoiceRoute = require("./routes/invoice");
app.use("/api", invoiceRoute);

// Pricing
const pricingRoute = require("./routes/pricingRoute")(db);
app.use("/api/pricing", pricingRoute);

// Save quotation items
const saveQuotationRoute = require('./routes/saveQuotation')(db);
app.use('/api/save-quotation-items', saveQuotationRoute);

// Analytics
const chatbotAnalytics = require('./routes/chatHomeAnalytics');
app.use('/api', chatbotAnalytics);
const analyticsRoutes = require('./routes/analyticsRoutes')(db);
app.use('/api/analytics', analyticsRoutes);

// Quotation Items
app.get('/api/quotation-items/:quote_id', (req, res) => {
  const { quote_id } = req.params;
  const fetchItemsSQL = `
    SELECT qi.quote_item_id, qi.product_id, p.name AS product_name, 
           qi.product_attribute_id, pa.name AS attribute_name, qi.quantity, 
           qi.unit_price, qi.quantity*qi.unit_price AS total_price, qi.is_selected, q.dealer_id
    FROM ro_cpq.quotationitems qi
    JOIN ro_cpq.product p 
      ON qi.product_id = p.product_id AND p.tenant_id = qi.tenant_id
    JOIN ro_cpq.product_attribute pa 
      ON qi.product_attribute_id = pa.attribute_id AND pa.tenant_id = qi.tenant_id
    JOIN ro_cpq.quotation q 
      ON q.quote_id = qi.quote_id AND q.tenant_id = qi.tenant_id
    WHERE qi.tenant_id = ? AND qi.quote_id = ?;
  `;
  db.query(fetchItemsSQL, [req.tenant_id, quote_id], (err, results) => {
    if (err) {
      console.error("Error fetching quotation items:", err);
      return res.status(500).json({ error: "Failed to fetch quotation items" });
    }
    res.json(results);
  });
});

// Quotes by Phone
const quotesByPhoneRouter = require('./routes/quotesByPhone')(db);
app.use('/api/quotes', quotesByPhoneRouter);

// Change Password
const changePasswordRouter = require('./routes/changePassword');
app.use('/api', changePasswordRouter);

// Simple /api/me probe
app.get('/api/me', (req, res) => {
  res.json({ ok: true, user: req.user, tenant_id: req.tenant_id });
});

// ----- OLD UNPROTECTED ROUTES (MOVED) -----
app.get('/api/quotes-raw', (req, res) => {
  const sql = 'SELECT * FROM ro_cpq.quotation WHERE tenant_id = ? ORDER BY date_created DESC';
  db.query(sql, [req.tenant_id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch quotes' });
    res.json(results);
  });
});

app.post('/api/dealer-quotation', (req, res) => {
  const { full_name, phone, location, total_price, user_id, dealer_type, 
          account_type, tds_level, hardness_level } = req.body;

  if (!full_name || !phone || !location || !user_id ||
      tds_level === undefined || hardness_level === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const tds = parseFloat(tds_level);
  const hardness = parseFloat(hardness_level);

  function checkOrCreateDealer(callback) {
    const checkDealerSQL = `
      SELECT dealer_id FROM ro_cpq.dealer 
      WHERE phone = ? AND tenant_id = ?
    `;
    db.query(checkDealerSQL, [phone, req.tenant_id], (err, existing) => {
      if (err) return callback(new Error("Dealer lookup failed"));
      if (existing.length > 0) return callback(null, existing[0].dealer_id);

      const insertDealerSQL = `
        INSERT INTO ro_cpq.dealer (tenant_id, full_name, phone, location, dealer_type, account_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      db.query(insertDealerSQL, 
        [req.tenant_id, full_name, phone, location, dealer_type, account_type], 
        (err, dealerResult) => {
          if (err) return callback(new Error("Dealer insert failed"));
          callback(null, dealerResult.insertId);
        }
      );
    });
  }

  function determineWaterCondition(tds, hardness, callback) {
    const conditionSQL = `
      SELECT condition_id
      FROM ro_cpq.water_condition
      WHERE tenant_id = ?
        AND ? BETWEEN tds_min AND tds_max
        AND ? BETWEEN hardness_min AND hardness_max
      LIMIT 1
    `;
    db.query(conditionSQL, [req.tenant_id, tds, hardness], (err, rows) => {
      if (err) return callback(new Error("Water condition check failed"));
      callback(null, rows.length > 0 ? rows[0].condition_id : null);
    });
  }

  function createQuotation(dealerID, callback) {
    const quoteSQL = `
      INSERT INTO ro_cpq.quotation (tenant_id, user_id, total_price, status, dealer_id)
      VALUES (?, ?, ?, 'Draft', ?)
    `;
    db.query(quoteSQL, [req.tenant_id, user_id, total_price, dealerID], (err, r) => {
      if (err) return callback(new Error("Quotation insert failed"));
      callback(null, r.insertId);
    });
  }

  function loadProductsForQuotation(quote_id, matchedConditionId, callback) {
    let productSQL = `
      SELECT product_id
      FROM ro_cpq.product
      WHERE tenant_id = ? AND condition_id = 3
    `;
    const params = [req.tenant_id];

    if (matchedConditionId) {
      productSQL += ` OR (tenant_id = ? AND condition_id = ${db.escape(matchedConditionId)})`;
      params.push(req.tenant_id);
    }

    db.query(productSQL, params, (err, productResults) => {
      if (err) return callback(new Error("Error fetching products"));
      if (productResults.length === 0) return callback(null);

      let processed = 0, hasError = false;

      productResults.forEach((row) => {
        addProductToQuotation(quote_id, row.product_id, (err) => {
          if (err && !hasError) { hasError = true; return callback(err); }
          processed++;
          if (processed === productResults.length && !hasError) callback(null);
        });
      });
    });
  }

  function addProductToQuotation(quote_id, product_id, callback) {
    const attributeSQL = `
      SELECT attribute_id
      FROM ro_cpq.product_attribute
      WHERE tenant_id = ? AND product_id = ?
      ORDER BY attribute_id ASC LIMIT 1
    `;
    db.query(attributeSQL, [req.tenant_id, product_id], (err, attrRows) => {
      if (err || attrRows.length === 0) return callback(null);

      const attribute_id = attrRows[0].attribute_id;
      const pricingSQL = `
        SELECT price, min_quantity
        FROM ro_cpq.product_pricing
        WHERE tenant_id = ? AND attribute_id = ?
        ORDER BY pricing_id ASC LIMIT 1
      `;
      db.query(pricingSQL, [req.tenant_id, attribute_id], (err, priceRows) => {
        if (err || priceRows.length === 0) return callback(null);

        const { price, min_quantity } = priceRows[0];
        const insertItemSQL = `
          INSERT INTO ro_cpq.quotationitems 
            (tenant_id, quote_id, product_id, product_attribute_id, quantity, unit_price)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        db.query(insertItemSQL,
          [req.tenant_id, quote_id, product_id, attribute_id, min_quantity, price],
          (err) => err ? callback(new Error("Failed to add product")) : callback(null)
        );
      });
    });
  }

  checkOrCreateDealer((err, dealerID) => {
    if (err) return res.status(500).json({ error: err.message });
    determineWaterCondition(tds, hardness, (err, matchedConditionId) => {
      if (err) return res.status(500).json({ error: err.message });
      createQuotation(dealerID, (err, quote_id) => {
        if (err) return res.status(500).json({ error: err.message });
        loadProductsForQuotation(quote_id, matchedConditionId, (err) => {
          if (err) {
            return res.status(500).json({ error: err.message, quote_id });
          }
          const createFollowup = require('./routes/CreateFollowup');
          createFollowup('quote', quote_id, req.user.id, req.user.id);
          return res.json({ message: "Dealer, Quotation, and All Quotation Items created", quote_id });
        });
      });
    });
  });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1';
const USE_HTTPS = process.env.USE_HTTPS === 'true';

// ------------- 6) HTTPS server -------------
if (USE_HTTPS) {
  const httpsOptions = {
    key: fs.readFileSync(path.resolve(__dirname, '../key.pem')),
    cert: fs.readFileSync(path.resolve(__dirname, '../cert.pem')),
  };
  https.createServer(httpsOptions, app).listen(PORT, HOST, () => {
    console.log(`🔒 HTTPS backend running at https://${HOST}:${PORT}`);
  });
} else {
  http.createServer(app).listen(PORT, HOST, () => {
    console.log(`✅ HTTP backend running at http://${HOST}:${PORT}`);
  });
}