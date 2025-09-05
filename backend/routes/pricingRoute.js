module.exports = (db) => {
  const router = require("express").Router();

  /**
   * GET /pricing/:attribute_id?dealer_id=96
   * Returns: {
   *   cost_price, price,
   *   min_margin_percent, max_margin_percent,
   *   min_allowed_price, max_allowed_price
   * }
   */
  router.get("/:attribute_id", (req, res) => {
    const attrId = req.params.attribute_id;
    const dealerId = req.query.dealer_id;
    const tenant_id = req.tenant_id;

    if (!dealerId) {
      return res.status(400).json({ error: "Missing dealer_id in query parameters." });
    }

    const marginAndPriceSql = `
      SELECT 
        pp.cost_price, 
        pp.price, 
        actype.min_margin_percent, 
        actype.max_margin_percent
      FROM ro_cpq.dealer dlr
      JOIN ro_cpq.account_types actype ON actype.account_type_name = dlr.account_type
      CROSS JOIN (
        SELECT cost_price, price
        FROM ro_cpq.product_pricing
        WHERE attribute_id = ? AND tenant_id = ?
        ORDER BY min_quantity DESC
        LIMIT 1
      ) pp
      WHERE dlr.dealer_id = ? AND dlr.tenant_id = ?
    `;

    db.query(marginAndPriceSql, [attrId, tenant_id, dealerId, tenant_id], (err, rows) => {
      if (err) {
        console.error("Pricing+Margin lookup error:", err);
        return res.status(500).json({ error: "Database error during pricing/margin lookup" });
      }

      if (!rows.length) {
        return res.status(404).json({ error: "No pricing or margin found for given input." });
      }

      const {
        cost_price,
        price,
        min_margin_percent,
        max_margin_percent
      } = rows[0];

      const min_allowed_price = parseFloat(
        (cost_price * (1 + min_margin_percent / 100)).toFixed(2)
      );
      const max_allowed_price = parseFloat(
        (cost_price * (1 + max_margin_percent / 100)).toFixed(2)
      );

      res.json({
        cost_price,
        price,
        min_margin_percent,
        max_margin_percent,
        min_allowed_price,
        max_allowed_price
      });
    });
  });

  return router;
};