const express = require('express');
const router = express.Router();

module.exports = (db) => {
  router.post('/', (req, res) => {
    const { dealer, user_id, total_price, cartItems, note } = req.body;
    const currentUserId = user_id;

    if (!dealer || !user_id || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    db.getConnection((err, conn) => {
      if (err) {
        console.error('Connection error:', err);
        return res.status(500).json({ error: 'Database connection failed' });
      }

      conn.beginTransaction((err) => {
        if (err) { conn.release(); return res.status(500).json({ error: 'Failed to start transaction' }); }

        let dealerId = dealer.dealer_id || null;

        const handleKamAndCreateQuote = (kamId) => {
          conn.query(
            `INSERT INTO ro_cpq.quotation (tenant_id, dealer_id, user_id, total_price, assigned_kam_id)
             VALUES (?, ?, ?, ?, ?)`,
            [req.tenant_id, dealerId, currentUserId, total_price, kamId],
            (err, quoteResult) => {
              if (err) {
                return conn.rollback(() => {
                  conn.release();
                  console.error('Insert quotation failed:', err);
                  res.status(500).json({ error: 'Insert quotation failed' });
                });
              }

              const quote_id = quoteResult.insertId;

              const itemQueries = cartItems.map(item => new Promise((resolve, reject) => {
                conn.query(
                  `INSERT INTO ro_cpq.quotationitems 
                     (tenant_id, quote_id, product_id, product_attribute_id, quantity, unit_price, is_selected)
                   VALUES (?, ?, ?, ?, ?, ?, '1')`,
                  [req.tenant_id, quote_id, item.product_id, item.product_attribute_id, item.quantity, item.unit_price],
                  (err) => err ? reject(err) : resolve()
                );
              }));

              const createFollowup = require('./CreateFollowup');
              createFollowup(req.tenant_id, 'quote', quote_id, user_id, user_id);

              const insertNote = () => new Promise((resolve, reject) => {
                if (!note || note.trim() === '') return resolve();
                conn.query(
                  `INSERT INTO ro_cpq.notes (tenant_id, quote_id, content, created_by, created_at)
                   VALUES (?, ?, ?, ?, NOW())`,
                  [req.tenant_id, quote_id, note.trim(), user_id],
                  (err) => err ? reject(err) : resolve()
                );
              });

              Promise.all([...itemQueries, insertNote()])
                .then(() => {
                  conn.commit((err) => {
                    if (err) {
                      return conn.rollback(() => {
                        conn.release();
                        res.status(500).json({ error: 'Commit failed' });
                      });
                    }
                    conn.release();
                    res.json({ success: true, quote_id, dealer_id: dealerId, assigned_kam_id: kamId });
                  });
                })
                .catch(err => {
                  conn.rollback(() => {
                    conn.release();
                    console.error('Insert item/note failed:', err);
                    res.status(500).json({ error: 'Insert failed' });
                  });
                });
            }
          );
        };

        if (!dealerId) {
          const kamId = dealer.account_manager_id ?? currentUserId;
          conn.query(
            `INSERT INTO dealer
               (full_name, phone, email, location, dealer_type, account_type, gst_number,
                account_manager_id, date_created)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [dealer.full_name, dealer.phone, dealer.email, dealer.location, dealer.dealer_type, dealer.account_type, dealer.gst_number ?? null, kamId],
            (err, ins) => {
              if (err) {
                return conn.rollback(() => {
                  conn.release();
                  console.error('Dealer insert failed:', err);
                  res.status(500).json({ error: 'Dealer insert failed' });
                });
              }
              dealerId = ins.insertId;
              handleKamAndCreateQuote(kamId);
            }
          );
        } else {
          conn.query(
            `SELECT account_manager_id FROM dealer WHERE dealer_id = ? FOR UPDATE`,
            [dealerId],
            (err, rows) => {
              if (err) {
                return conn.rollback(() => {
                  conn.release();
                  console.error('Dealer lookup failed:', err);
                  res.status(500).json({ error: 'Dealer lookup failed' });
                });
              }
              const dealerRow = rows[0];
              let kamId = dealerRow?.account_manager_id ?? null;

              if (!kamId) {
                kamId = currentUserId;
                conn.query(
                  `UPDATE dealer SET account_manager_id = ? WHERE dealer_id = ?`,
                  [kamId, dealerId],
                  (err) => {
                    if (err) {
                      return conn.rollback(() => {
                        conn.release();
                        console.error('Dealer KAM backfill failed:', err);
                        res.status(500).json({ error: 'Dealer KAM backfill failed' });
                      });
                    }
                    handleKamAndCreateQuote(kamId);
                  }
                );
              } else {
                handleKamAndCreateQuote(kamId);
              }
            }
          );
        }
      });
    });
  });

  return router;
};