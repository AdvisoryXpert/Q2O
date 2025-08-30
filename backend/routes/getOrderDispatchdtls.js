// dispatchOrdersdtls.js
const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  router.get('/:orderId', (req, res) => {
    const { orderId } = req.params;

    const query = `
      SELECT 
      prd.name AS product_name, 
      dlr.full_name as dealer_name,
      dlr.dealer_id,
      prd.product_id,
      attr.name AS component_name, 
      attr.attribute_id AS product_attribute_id,
      line.order_line_id,
      line.quantity, 
      line.unit_price, 
      line.total_price 
    FROM 
      ro_cpq.order_line line
      JOIN ro_cpq.product prd ON line.product_id = prd.product_id
      JOIN ro_cpq.product_attribute attr ON line.product_attribute_id = attr.attribute_id
      JOIN ro_cpq.orders ord ON line.order_id = ord.order_id
      JOIN ro_cpq.dealer dlr ON ord.dealer_id = dlr.dealer_id
    WHERE 
      line.order_id = ?
    `;

   db.query(query, [orderId], (err, results) => {
    if (err) {
      console.error("Error fetching dispatch data:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "No line items found for this order" });
    }

    // Include dealer info from the first row (they’re all the same for the order)
    const { dealer_id, dealer_name } = results[0];

    res.json({
      dealer_id,
      dealer_name,
      lineItems: results.map(row => ({
        order_line_id: row.order_line_id,
        product_id: row.product_id,
        product_name: row.product_name,
        product_attribute_id: row.product_attribute_id,
        component_name: row.component_name,
        quantity: row.quantity,
        unit_price: row.unit_price,
        total_price: row.total_price
      }))
    });
  });
});

  return router;
};
