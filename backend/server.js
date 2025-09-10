// node backend/server.js
const express = require('express');
const cors = require('cors');
const db = require('./db'); // Make sure path is correct if in a different folder
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const app = express();
const fs = require('fs');
const https = require('https');
require('dotenv').config({ path: '../.env' });

// ---------------- CORS (add your Vite HTTPS origins) ----------------
const corsOptions = {
  origin: [
    'http://192.168.1.3:3000',
    'https://192.168.1.3:3000',
    'https://127.0.0.1:5173',
    'https://q2o.local:5173'
  ],
  credentials: true,
};
app.use(cors(corsOptions));

// ---------------- Parsers / proxy trust ----------------
app.use(express.json());
app.use(cookieParser());

// Trust the first proxy
app.set('trust proxy', 1);

// ---------------- Session cookie (cross-site over HTTPS) ----------------
app.use(session({
  secret: 'your_secret_key', // TODO: replace with strong secret & move to .env
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true,       // must be true when using HTTPS
    httpOnly: true, 
    sameSite: 'none',   // required for cross-site cookies
    domain: process.env.COOKIE_DOMAIN // optional: set your domain if needed
  }
}));

// ---------------- Activity log & static ----------------
const activityLogger = require('./middleware/activityLogger')(db);
app.use(activityLogger);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------------- DB ping ----------------
db.getConnection((err, connection) => {
  if (err) {
    console.error('Database Connection Failed:', err);
    return;
  }
  console.log('MySQL Connected');
  connection.release();
});

// ---------------- Routes ----------------
const accountTypesRouter = require('./routes/accountTypes')(db);
app.use('/api/account-types', accountTypesRouter);

// Mount LR Receipts routes
const lrReceiptsRouter = require('./routes/lrReceipts')(db);
const expressFileUpload = require('express-fileupload');
app.use('/api/lr-receipts', expressFileUpload(), lrReceiptsRouter);
const updateAttachmentRouter = require('./routes/updateAttachment');
app.use('/api/lr-receipts', updateAttachmentRouter);
app.use('/uploads/lr-receipts', express.static(path.join(__dirname, 'uploads/lr-receipts')));

// SR
const serviceUpload = require('./routes/updateServiceAttachment');
app.use('/api/service-requests', expressFileUpload(), serviceUpload);

// Dealer routes
const dealerRouter = require('./routes/dealer')(db);
app.use('/api/dealers', dealerRouter);

// Dealer Quotation From POS Cart
const dealerQuotationFromCart = require('./routes/dealerQuotationFromCart')(db);
app.use('/dealer-quotation-from-cart', dealerQuotationFromCart);

// Mobile dispatch data
const disptch_mob = require('./routes/getOrderDispatchdtls')(db);
app.use('/api/dipatch_mob', disptch_mob);

// Warranty / Dispatch / POS
const warrantyRoutes = require('./routes/warrantyRoutes');
app.use('/api/warranty', warrantyRoutes);
const getDispatchInfoRoutes = require('./routes/getOrderDispatchInfo');
app.use('/api/dispatchOrders', getDispatchInfoRoutes);
const posDispatchRouter = require('./routes/pos_dispatch');
app.use('/api/orders_pos', posDispatchRouter);

// SR API
const serviceRequestAPI = require('./routes/serviceRequestAPI');
app.use('/api/service-requests', serviceRequestAPI);

// Notes
const notesRoutes = require('./routes/notes');
app.use('/notes', notesRoutes);

// Attributes
const attributeRoutes = require('./routes/attributes');
app.use('/attributes', attributeRoutes);

// Pricing
const productPricingRoutes = require('./routes/productPricingRoutes');
app.use('/api/product-pricing', productPricingRoutes);

// Product Admin
const productAdminRoutes = require('./routes/productAdminRoutes');
app.use('/api', productAdminRoutes);

// User role/access
const userAccessRoutes = require('./routes/user_role_Access');
app.use('/api/userMgmt', userAccessRoutes(db));

// Quote to Order
const quotestoorderRoutes = require('./routes/quotestoorder');
app.use('/api/quotestoorder', quotestoorderRoutes);

// Followups
const followupsRouter = require('./routes/followups');
app.use('/api/followups', followupsRouter);

// Orders
const postoorderRoutes = require('./routes/orders');
app.use('/api/orders', postoorderRoutes);

// Product attribute APIs
const productAttributesRouter = require('./routes/Product_attributes')(db);
app.use('/api/product_attributes', productAttributesRouter);
const productvariantRouter = require('./routes/product_variants')(db);
app.use('/api/product_variants', productvariantRouter);

// Recent orders & dispatch
const recentOrders = require('./routes/recentorders');
app.use('/api/recentorders', recentOrders);
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

// Auth/session
const loginRouter = require('./routes/login')(db);
app.use('/api/login', loginRouter);
const logoutRouter = require('./routes/logout')();
app.use('/api/logout', logoutRouter);
const sessionRouter = require('./routes/session');
app.use('/api', sessionRouter);

// user_access
const accessRouter = require('./routes/user_access')(db);
app.use('/api/user-access', accessRouter);

// Pricing (non-/api prefix in your original file)
const pricingRoute = require("./routes/pricingRoute")(db);
app.use("/pricing", pricingRoute);

// Save quotation items
const saveQuotationRoute = require('./routes/saveQuotation')(db);
app.use('/api/save-quotation-items', saveQuotationRoute);

// Analytics
const chatbotAnalytics = require('./routes/chatHomeAnalytics');
app.use('/api', chatbotAnalytics);
const analyticsRoutes = require('./routes/analyticsRoutes')(db);
app.use('/api/analytics', analyticsRoutes);

// Quote items
const quotationItemsRoute = require('./routes/quotationItems');
app.use('/api/quotationitems', quotationItemsRoute(db));

// Upload PDF
const uploadPdfRouter = require('./routes/uploadPdf');
app.use('/api', uploadPdfRouter);

// Quotes list
app.get('/quotes', (req, res) => {
  const sql = 'SELECT * FROM ro_cpq.quotation ORDER BY date_created DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching quotes:', err);
      return res.status(500).json({ error: 'Failed to fetch quotes' });
    }
    res.json(results);
  });
});

// Dealer quotation creation (left exactly as you had it)
app.post('/dealer-quotation', (req, res) => {
  console.log("Received payload:", req.body);

  const { full_name, phone, location, total_price, user_id, dealer_type, 
          account_type, tds_level, hardness_level, product_id } = req.body;

  if (!full_name || !phone || !location || !user_id || 
      tds_level === undefined || hardness_level === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const tds = parseFloat(tds_level);
  const hardness = parseFloat(hardness_level);

  checkOrCreateDealer((err, dealerID) => {
    if (err) {
      console.error("Dealer processing error:", err);
      return res.status(500).json({ error: err.message });
    }

    determineWaterCondition(tds, hardness, (err, matchedConditionId) => {
      if (err) {
        console.error("Water condition error:", err);
        return res.status(500).json({ error: err.message });
      }

      console.log(`Matched condition ID for TDS=${tds}, Hardness=${hardness}:`, matchedConditionId);

      createQuotation(dealerID, (err, quote_id) => {
        if (err) {
          console.error("Quotation creation error:", err);
          return res.status(500).json({ error: err.message });
        }

        loadProductsForQuotation(quote_id, matchedConditionId, (err) => {
          if (err) {
            console.error("Product loading error:", err);
            return res.status(500).json({ 
              error: err.message,
              quote_id // still return the quote_id even if products failed
            });
          }

          const createFollowup = require('./routes/CreateFollowup');
          createFollowup(req.tenant_id, 'quote', quote_id, req.user.id, req.user.id);
          
          return res.json({
            message: "Dealer, Quotation, and All Quotation Items created successfully",
            quote_id
          });
        });
      });
    });
  });

  function checkOrCreateDealer(callback) {
    const checkDealerSQL = `SELECT dealer_id FROM ro_cpq.dealer WHERE phone = ?`;
    db.query(checkDealerSQL, [phone], (err, existingDealerResult) => {
      if (err) return callback(new Error("Dealer lookup failed"));
      if (existingDealerResult.length > 0) {
        return callback(null, existingDealerResult[0].dealer_id);
      }
      const insertDealerSQL = `
        INSERT INTO ro_cpq.dealer (full_name, phone, location, dealer_type, account_type)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.query(insertDealerSQL, 
        [full_name, phone, location, dealer_type, account_type], 
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
      WHERE ? BETWEEN tds_min AND tds_max
        AND ? BETWEEN hardness_min AND hardness_max
      LIMIT 1
    `;
    db.query(conditionSQL, [tds, hardness], (err, conditionResult) => {
      if (err) return callback(new Error("Water condition check failed"));
      callback(null, conditionResult.length > 0 ? conditionResult[0].condition_id : null);
    });
  }

  function createQuotation(dealerID, callback) {
    const quoteSQL = `
      INSERT INTO ro_cpq.quotation (user_id, total_price, status, dealer_id)
      VALUES (?, ?, 'Draft', ?)
    `;
    db.query(quoteSQL, [user_id, total_price, dealerID], (err, quoteResult) => {
      if (err) return callback(new Error("Quotation insert failed"));
      callback(null, quoteResult.insertId);
    });
  }

  function loadProductsForQuotation(quote_id, matchedConditionId, callback) {
    let productSQL = `
      SELECT product_id
      FROM ro_cpq.product
      WHERE condition_id = 3
    `;
    if (matchedConditionId) {
      productSQL += ` OR condition_id = ${db.escape(matchedConditionId)}`;
    }
    db.query(productSQL, (err, productResults) => {
      if (err) return callback(new Error("Error fetching products"));
      if (productResults.length === 0) {
        console.warn("No products found for the conditions");
        return callback(null);
      }
      let productsProcessed = 0;
      let hasError = false;
      productResults.forEach((productRow) => {
        addProductToQuotation(quote_id, productRow.product_id, (err) => {
          if (err && !hasError) {
            hasError = true;
            return callback(err);
          }
          productsProcessed++;
          if (productsProcessed === productResults.length && !hasError) {
            callback(null);
          }
        });
      });
    });
  }

  function addProductToQuotation(quote_id, product_id, callback) {
    const attributeSQL = `
      SELECT attribute_id
      FROM ro_cpq.product_attribute
      WHERE product_id = ?
      ORDER BY attribute_id ASC
      LIMIT 1
    `;
    db.query(attributeSQL, [product_id], (err, attributeResult) => {
      if (err || attributeResult.length === 0) {
        console.warn(`No attributes found for product_id: ${product_id}`);
        return callback(null);
      }
      const attribute_id = attributeResult[0].attribute_id;

      const pricingSQL = `
        SELECT price, min_quantity
        FROM ro_cpq.product_pricing
        WHERE attribute_id = ?
        ORDER BY pricing_id ASC
        LIMIT 1
      `;
      db.query(pricingSQL, [attribute_id], (err, pricingResult) => {
        if (err || pricingResult.length === 0) {
          console.warn(`No pricing found for attribute_id: ${attribute_id}`);
          return callback(null);
        }
        const { price, min_quantity } = pricingResult[0];

        const insertItemSQL = `
          INSERT INTO ro_cpq.quotationitems (quote_id, product_id, product_attribute_id, quantity, unit_price)
          VALUES (?, ?, ?, ?, ?)
        `;
        db.query(insertItemSQL, 
          [quote_id, product_id, attribute_id, min_quantity, price], 
          (err) => {
            if (err) {
              console.error("Error inserting quotation item:", err);
              return callback(new Error("Failed to add product to quotation"));
            }
            callback(null);
          }
        );
      });
    });
  }
});

// Quotation items by quote_id
app.get('/quotation-items/:quote_id', (req, res) => {
  const { quote_id } = req.params;
  const fetchItemsSQL = `
    SELECT qi.quote_item_id, qi.product_id, p.name AS product_name, 
           qi.product_attribute_id, pa.name AS attribute_name, qi.quantity, 
           qi.unit_price,  qi.quantity*qi.unit_price AS total_price, qi.is_selected,q.dealer_id
    FROM ro_cpq.quotationitems qi
    JOIN ro_cpq.product p ON qi.product_id = p.product_id
    JOIN ro_cpq.product_attribute pa ON qi.product_attribute_id = pa.attribute_id
    JOIN ro_cpq.quotation q ON q.quote_id = qi.quote_id
    WHERE qi.quote_id = ?;
  `;
  db.query(fetchItemsSQL, [quote_id], (err, results) => {
    if (err) {
      console.error("Error fetching quotation items:", err);
      return res.status(500).json({ error: "Failed to fetch quotation items" });
    }
    console.log("Fetched quote items with dealer_id:", results[0]?.dealer_id);
    res.json(results);
  });
});

// ---------------- HTTPS startup (uses certs from ../certs) ----------------
const CERT_DIR = process.env.Q2O_CERT_DIR || path.resolve(__dirname, '../certs');
const KEY_PATH  = process.env.Q2O_TLS_KEY  || path.join(CERT_DIR, 'q2o-key.pem');
const CERT_PATH = process.env.Q2O_TLS_CERT || path.join(CERT_DIR, 'q2o-cert.pem');

if (!fs.existsSync(KEY_PATH) || !fs.existsSync(CERT_PATH)) {
  console.error('❌ TLS key/cert not found. Expected:');
  console.error('   ', KEY_PATH);
  console.error('   ', CERT_PATH);
  console.error('Generate them via scripts/gen-dev-cert.sh');
  process.exit(1);
}

const httpsOptions = {
  key: fs.readFileSync(KEY_PATH),
  cert: fs.readFileSync(CERT_PATH),
};

const PORT = process.env.PORT || 5000;
// 0.0.0.0 lets Windows ↔ WSL and LAN hit the server; use '127.0.0.1' if you prefer local only
const HOST = process.env.HOST || '0.0.0.0';

https.createServer(httpsOptions, app).listen(PORT, HOST, () => {
  console.log(`🔒 HTTPS backend running at https://127.0.0.1:${PORT}`);
});
