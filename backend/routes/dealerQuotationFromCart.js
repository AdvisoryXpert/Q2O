const express = require('express');
const router = express.Router();

module.exports = (db) => {
  router.post('/', (req, res) => {
    const { dealer, user_id, total_price, cartItems, note } = req.body;

    if (!dealer || !user_id || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    db.getConnection((err, connection) => {
      if (err) {
        console.error('Connection error:', err);
        return res.status(500).json({ error: 'Database connection failed' });
      }

      connection.beginTransaction((err) => {
        if (err) { connection.release(); return res.status(500).json({ error: 'Failed to start transaction' }); }

        // INSERT quotation (stamp tenant)
        connection.query(
          `INSERT INTO ro_cpq.quotation (tenant_id, dealer_id, user_id, total_price)
           VALUES (?, ?, ?, ?)`,
          [req.tenant_id, dealer.dealer_id, user_id, total_price],
          (err, quoteResult) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                console.error('Insert quotation failed:', err);
                res.status(500).json({ error: 'Insert quotation failed' });
              });
            }

            const quote_id = quoteResult.insertId;

            // Insert all quotation items (stamp tenant)
            const itemQueries = cartItems.map(item => new Promise((resolve, reject) => {
              connection.query(
                `INSERT INTO ro_cpq.quotationitems 
                   (tenant_id, quote_id, product_id, product_attribute_id, quantity, unit_price, is_selected)
                 VALUES (?, ?, ?, ?, ?, ?, '1')`,
                [req.tenant_id, quote_id, item.product_id, item.product_attribute_id, item.quantity, item.unit_price],
                (err) => err ? reject(err) : resolve()
              );
            }));

            // Create followup (now requires tenant_id as first arg)
            const createFollowup = require('./CreateFollowup');
            createFollowup(req.tenant_id, 'quote', quote_id, user_id, user_id);

            // Optional note (stamp tenant if your notes table is tenantized)
            const insertNote = () => new Promise((resolve, reject) => {
              if (!note || note.trim() === '') return resolve();
              connection.query(
                `INSERT INTO ro_cpq.notes (tenant_id, quote_id, content, created_by, created_at)
                 VALUES (?, ?, ?, ?, NOW())`,
                [req.tenant_id, quote_id, note.trim(), user_id],
                (err) => err ? reject(err) : resolve()
              );
            });

            Promise.all([...itemQueries, insertNote()])
              .then(() => {
                connection.commit((err) => {
                  if (err) {
                    return connection.rollback(() => {
                      connection.release();
                      res.status(500).json({ error: 'Commit failed' });
                    });
                  }
                  connection.release();
                  res.json({ success: true, quote_id });
                });
              })
              .catch(err => {
                connection.rollback(() => {
                  connection.release();
                  console.error('Insert item/note failed:', err);
                  res.status(500).json({ error: 'Insert failed' });
                });
              });
          }
        );
      });
    });
  });

  return router;
};
