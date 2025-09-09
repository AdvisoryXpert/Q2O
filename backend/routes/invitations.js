
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../db');

const router = express.Router();

// Middleware to check if the user has the 'Admin' role
const isAdmin = (req, res, next) => {
  // Assumes the `verifyToken` middleware has already run and set req.user
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: You do not have administrative privileges.' });
  }
};

// --- Endpoint to create a new user invitation ---
// POST /api/invitations/
router.post('/', isAdmin, (req, res) => {
  const { email, role } = req.body;
  const { id: invited_by } = req.user;
  const tenant_id = req.tenant_id;

  if (!email || !role) {
    return res.status(400).json({ error: 'Email and role are required.' });
  }

  db.query('SELECT user_id FROM users WHERE email = ? AND tenant_id = ?', [email, tenant_id], (err, existingUsers) => {
    if (err) {
      console.error('Error checking for existing user:', err);
      return res.status(500).json({ error: 'An error occurred while creating the invitation.' });
    }

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists in this tenant.' });
    }

    const invitation_token = crypto.randomBytes(32).toString('hex');
    const token_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const invitation = {
      tenant_id,
      email,
      role,
      invitation_token,
      token_expires_at,
      invited_by
    };

    db.query('INSERT INTO user_invitations SET ?', invitation, (err, result) => {
      if (err) {
        console.error('Error creating invitation:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'An invitation for this email address already exists.' });
        }
        return res.status(500).json({ error: 'An error occurred while creating the invitation.' });
      }

      const invitation_link = `https://your-frontend-app.com/accept-invitation?token=${invitation_token}`;

      res.status(201).json({
        message: 'Invitation created successfully. Send this link to the user.',
        invitation_link: invitation_link
      });
    });
  });
});

module.exports = router;
