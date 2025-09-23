// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function verifyToken(req, res, next) {
  // 1) Prefer cookie (refresh-friendly), then fall back to Bearer
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : null;
  const token = req.cookies?.auth_token || bearer; // <-- cookie first

  if (!token) return res.status(401).json({ message: 'No auth token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');

    // Attach user context for downstream routes
    req.user = {
      id: decoded.user_id,
      role: decoded.userRole,
      name: decoded.userName,
      mobile: decoded.mobile,       // include if present in JWT
    };

    // Tenant logic (same as your original)
    const tokenTid = Number(decoded.tenant_id);
    const headerTid = req.header('x-tenant-id');
    const desiredTid = headerTid ? Number(headerTid) : tokenTid;

    if (!desiredTid || Number.isNaN(desiredTid)) {
      return res.status(400).json({ message: 'Missing/invalid tenant id' });
    }
    if (tokenTid && desiredTid !== tokenTid) {
      return res.status(403).json({ message: 'Tenant access denied (switching not enabled yet)' });
    }

    req.tenant_id = desiredTid;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
