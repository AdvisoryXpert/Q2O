const express = require("express");
const router = express.Router();
const db = require("../db");

// ✅ GET /api/orders-basic — returns all order_id + invoice_id pairs
router.get("/orders-basic", (req, res) => {
  db.query("SELECT order_id, invoice_id,dealer_id FROM orders", (err, results) => {
    if (err) {
      console.error("Error fetching order basics:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

module.exports = router;
