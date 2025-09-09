
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

const router = express.Router();

// --- Endpoint to accept an invitation and create the user ---
// POST /api/invitations/accept
router.post('/accept', (req, res) => {
  const { token, full_name, password } = req.body;

  if (!token || !full_name || !password) {
    return res.status(400).json({ error: 'Token, full name, and password are required.' });
  }

  db.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting DB connection:', err);
      return res.status(500).json({ error: 'An internal server error occurred.' });
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: 'An internal server error occurred.' });
      }

      connection.query('SELECT * FROM user_invitations WHERE invitation_token = ? AND status = \'pending\'', [token], (err, invitations) => {
        if (err) {
          return connection.rollback(() => { connection.release(); res.status(500).json({ error: 'An error occurred while accepting the invitation.' }); });
        }

        if (invitations.length === 0) {
          return connection.rollback(() => { connection.release(); res.status(404).json({ error: 'Invitation not found or already accepted.' }); });
        }

        const invitation = invitations[0];

        if (new Date(invitation.token_expires_at) < new Date()) {
          return connection.query('UPDATE user_invitations SET status = \'expired\' WHERE invitation_id = ?', [invitation.invitation_id], () => {
            connection.commit((commitErr) => {
                connection.release();
                if(commitErr) return res.status(500).json({ error: 'An error occurred while accepting the invitation.' });
                res.status(410).json({ error: 'Invitation has expired.' });
            });
          });
        }

        bcrypt.genSalt(10, (err, salt) => {
            if (err) {
                return connection.rollback(() => { connection.release(); res.status(500).json({ error: 'An error occurred while accepting the invitation.' }); });
            }
            bcrypt.hash(password, salt, (err, password_hash) => {
                if (err) {
                    return connection.rollback(() => { connection.release(); res.status(500).json({ error: 'An error occurred while accepting the invitation.' }); });
                }

                const newUser = {
                  tenant_id: invitation.tenant_id,
                  full_name,
                  email: invitation.email,
                  password_hash,
                  role: invitation.role,
                  two_fa_enabled: false,
                  can_regenerate_2fa: true
                };

                connection.query('INSERT INTO users SET ?', newUser, (err, userResult) => {
                  if (err) {
                    return connection.rollback(() => {
                        connection.release();
                        if (err.code === 'ER_DUP_ENTRY') {
                            return res.status(409).json({ error: 'A user with this email already exists.' });
                        }
                        res.status(500).json({ error: 'An error occurred while accepting the invitation.' });
                    });
                  }

                  connection.query('UPDATE user_invitations SET status = \'accepted\' WHERE invitation_id = ?', [invitation.invitation_id], (err) => {
                    if (err) {
                      return connection.rollback(() => { connection.release(); res.status(500).json({ error: 'An error occurred while accepting the invitation.' }); });
                    }

                    connection.commit((err) => {
                      if (err) {
                        return connection.rollback(() => { connection.release(); res.status(500).json({ error: 'An error occurred while accepting the invitation.' }); });
                      }

                      connection.release();
                      res.status(201).json({ 
                          message: 'User account created successfully! You can now log in.',
                          user_id: userResult.insertId
                      });
                    });
                  });
                });
            });
        });
      });
    });
  });
});

module.exports = router;
