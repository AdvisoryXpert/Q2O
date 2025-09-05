// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = m && m[1];
  if (!token) return res.status(401).json({ message: 'Authorization header missing' });

  jwt.verify(token, process.env.JWT_SECRET || 'dev_secret', (err, decoded) => {
    if (err || !decoded) return res.status(401).json({ message: 'Invalid or expired token' });

    // Attach user context for downstream routes
    req.user = {
      id: decoded.user_id,
      role: decoded.userRole,
      name: decoded.userName,
    };

    // Phase-1: single tenant per token
    const tokenTid = Number(decoded.tenant_id);
    const headerTid = req.header('x-tenant-id');
    const desiredTid = headerTid ? Number(headerTid) : tokenTid;

    if (!desiredTid || Number.isNaN(desiredTid)) {
      return res.status(400).json({ message: 'Missing/invalid tenant id' });
    }
    // Disallow switching tenants until multi-tenant membership is implemented
    if (tokenTid && desiredTid !== tokenTid) {
      return res.status(403).json({ message: 'Tenant access denied (switching not enabled yet)' });
    }

    req.tenant_id = desiredTid;
    next();
  });
};
