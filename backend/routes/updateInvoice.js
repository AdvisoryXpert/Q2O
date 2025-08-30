const express = require("express");
const router = express.Router();
const db = require("../db");

// Update invoice_id for an order
router.post("/update-invoice-id", (req, res) => {
  const { order_id, invoice_id } = req.body;

  if (!order_id) {
    return res.status(400).json({ success: false, error: "Missing order_id" });
  }

  const sql = "UPDATE orders SET invoice_id = ? WHERE order_id = ?";
  db.query(sql, [invoice_id, order_id], (err, result) => {
    if (err) {
      console.error("Error updating invoice_id:", err);
      return res.status(500).json({ success: false, error: "DB error" });
    }

    res.json({ success: true });
  });
});

module.exports = router;
