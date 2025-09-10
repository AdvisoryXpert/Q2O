// node backend/server.js
require('dotenv').config({ path: '../.env' }); // load env ASAP

const express = require('express');
const cors = require('cors');
const db = require('./db');
const path = require('path');
const cookieParser = require('cookie-parser');
const verifyToken = require('./middleware/auth');
const fs = require('fs');
const https = require('https');
const http = require('http');

const app = express();

// ---- CORS / parsers BEFORE auth ----
const allowedOrigins = [
  // old dev ports you used
  'http://127.0.0.1:3000',
  'https://127.0.0.1:3000',
  'http://192.168.1.73:3000',
  // add Vite defaults
  'http://127.0.0.1:5173',
  'https://127.0.0.1:5173',
  'https://q2o.local:5173'
];
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false); // ignore unknown origins in dev
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
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

// ------------ PUBLIC ROUTES ------------
const expressFileUpload = require('express-fileupload');
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

// ------------ AUTH GUARD ------------
app.use('/api', verifyToken);

// Activity logger AFTER auth so it can log req.user/req.tenant_id
const activityLogger = require('./middleware/activityLogger')(db);
app.use(activityLogger);

// ------------ PROTECTED ROUTES ------------
const invitationsRouter = require('./routes/invitations');
app.use('/api/admin/invitations', invitationsRouter);

const accountTypesRouter = require('./routes/accountTypes')(db);
app.use('/api/account-types', accountTypesRouter);

const lrReceiptsRouter = require('./routes/lrReceipts')(db);
app.use('/api/lr-receipts', expressFileUpload(), lrReceiptsRouter);
const updateAttachmentRouter = require('./routes/updateAttachment');
app.use('/api/lr-receipts', updateAttachmentRouter);

const serviceUpload = require('./routes/updateServiceAttachment');
app.use('/api/service-requests', expressFileUpload(), serviceUpload);
const serviceRequestAPI = require('./routes/serviceRequestAPI');
app.use('/api/service-requests', serviceRequestAPI);

const dealerRouter = require('./routes/dealer')(db);
app.use('/api/dealers', dealerRouter);

const dealerQuotationFromCart = require('./routes/dealerQuotationFromCart')(db);
app.use('/api/dealer-quotation-from-cart', dealerQuotationFromCart);

const disptch_mob = require('./routes/getOrderDispatchdtls')(db);
app.use('/api/dipatch_mob', disptch_mob);

const warrantyRoutes = require('./routes/warrantyRoutes');
app.use('/api/warranty', warrantyRoutes);
const getDispatchInfoRoutes = require('./routes/getOrderDispatchInfo');
app.use('/api/dispatchOrders', getDispatchInfoRoutes);

const posDispatchRouter = require('./routes/pos_dispatch');
app.use('/api/orders_pos', posDispatchRouter);

const notesRoutes = require('./routes/notes');
app.use('/api/notes', notesRoutes);

const attributeRoutes = require('./routes/attributes');
app.use('/api/attributes', attributeRoutes);

const productPricingRoutes = require('./routes/productPricingRoutes');
app.use('/api/product-pricing', productPricingRoutes);

const productAdminRoutes = require('./routes/productAdminRoutes');
app.use('/api', productAdminRoutes);

const userAccessRoutes = require('./routes/user_role_Access');
app.use('/api/userMgmt', userAccessRoutes(db));

const quotestoorderRoutes = require('./routes/quotestoorder');
app.use('/api/quotestoorder', quotestoorderRoutes);

const followupsRouter = require('./routes/followups');
app.use('/api/followups', followupsRouter);

const postoorderRoutes = require('./routes/orders');
app.use('/api/orders', postoorderRoutes);

const productAttributesRouter = require('./routes/Product_attributes')(db);
app.use('/api/product_attributes', productAttributesRouter);
const productvariantRouter = require('./routes/product_variants')(db);
app.use('/api/product_variants', productvariantRouter);

const recentOrders = require('./routes/recentorders');
app.use('/api/recentorders', recentOrders);

const dispatchOrders = require('./routes/dispatchOrders');
app.use('/api/dispatchorders', dispatchOrders(db));

const reminder = require('./routes/reminders')(db);
app.use('/api/reminders', reminder);

const updateInvoiceRoute = require("./routes/updateInvoice");
app.use("/api", updateInvoiceRoute);
const invoiceRoute = require("./routes/invoice");
app.use("/api", invoiceRoute);

const pricingRoute = require("./routes/pricingRoute")(db);
app.use("/api/pricing", pricingRoute);

const saveQuotationRoute = require('./routes/saveQuotation')(db);
app.use('/api/save-quotation-items', saveQuotationRoute);

const chatbotAnalytics = require('./routes/chatHomeAnalytics');
app.use('/api', chatbotAnalytics);
const analyticsRoutes = require('./routes/analyticsRoutes')(db);
app.use('/api/analytics', analyticsRoutes);

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

const quotesByPhoneRouter = require('./routes/quotesByPhone')(db);
app.use('/api/quotes', quotesByPhoneRouter);

const changePasswordRouter = require('./routes/changePassword');
app.use('/api', changePasswordRouter);

app.get('/api/me', (req, res) => {
  res.json({ ok: true, user: req.user, tenant_id: req.tenant_id });
});

// ------------ SERVER STARTUP ------------
const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';
const USE_HTTPS = (process.env.USE_HTTPS || 'true') === 'true';

// Cert locations (default to ../certs; allow override)
const CERT_DIR = process.env.Q2O_CERT_DIR || path.resolve(__dirname, '../certs');
const KEY_PATH  = process.env.Q2O_TLS_KEY  || path.join(CERT_DIR, 'q2o-key.pem');
const CERT_PATH = process.env.Q2O_TLS_CERT || path.join(CERT_DIR, 'q2o-cert.pem');

if (USE_HTTPS) {
  if (!fs.existsSync(KEY_PATH) || !fs.existsSync(CERT_PATH)) {
    console.error('❌ TLS key/cert not found. Run scripts/gen-dev-cert.sh to generate dev certs.');
    process.exit(1);
  }
  const httpsOptions = {
    key: fs.readFileSync(KEY_PATH),
    cert: fs.readFileSync(CERT_PATH),
  };
  https.createServer(httpsOptions, app).listen(PORT, HOST, () => {
    console.log(`🔒 HTTPS backend at https://127.0.0.1:${PORT}`);
  });
} else {
  http.createServer(app).listen(PORT, HOST, () => {
    console.log(`✅ HTTP backend at http://${HOST}:${PORT}`);
  });
}
