
const db = require('../db');

function getBusinessVertical(req, res, next) {
  const tenantId = req.tenant_id;

  if (!tenantId) {
    return res.status(400).json({ message: 'Missing tenant id' });
  }

  db.query('SELECT business_vertical FROM ro_cpq.tenants WHERE tenant_id = ?', [tenantId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    req.business_vertical = results[0].business_vertical;
    next();
  });
}

module.exports = getBusinessVertical;
