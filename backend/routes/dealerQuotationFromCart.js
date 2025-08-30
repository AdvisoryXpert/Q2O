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

      connection.beginTransaction(async (err) => {
        if (err) {
          connection.release();
          return res.status(500).json({ error: 'Failed to start transaction' });
        }

        connection.query(
          `INSERT INTO ro_cpq.quotation (dealer_id, user_id, total_price) VALUES (?, ?, ?)`,
          [dealer.dealer_id, user_id, total_price],
          (err, quoteResult) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                console.error('Insert quotation failed:', err);
                res.status(500).json({ error: 'Insert quotation failed' });
              });
            }

            const quote_id = quoteResult.insertId;

            // Insert all quotation items
            const itemQueries = cartItems.map(item => {
              return new Promise((resolve, reject) => {
                connection.query(
                  `INSERT INTO ro_cpq.quotationitems 
                  (quote_id, product_id, product_attribute_id, quantity, unit_price,is_selected)
                  VALUES (?, ?, ?, ?, ?,'1')`,
                  [quote_id, item.product_id, item.product_attribute_id, item.quantity, item.unit_price,item.is_selected],
                  (err) => {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              });
            });
            const createFollowup = require('./CreateFollowup');
            createFollowup('quote', quote_id, user_id, user_id);

            // Optional: Insert note
            const insertNote = () => {
              return new Promise((resolve, reject) => {
                if (!note || note.trim() === '') return resolve();
                connection.query(
                  `INSERT INTO ro_cpq.notes (quote_id, content, created_by, created_at)
                   VALUES (?, ?, ?, NOW())`,
                  [quote_id, note.trim(), user_id],
                  (err) => {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              });
            };

            // Run all inserts
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
