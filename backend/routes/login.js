// routes/login.js
const express = require('express');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const jwt = require('jsonwebtoken');
const router = express.Router();

module.exports = (db) => {
  router.post('/', (req, res) => {
    const { mobile, password } = req.body;
    if (!mobile || !password) {
      return res.status(400).json({ success: false, message: 'Mobile and password are required.' });
    }

    const query = `
      SELECT *, two_fa_enabled, can_regenerate_2fa, tenant_id
      FROM ro_cpq.users
      WHERE phone = ?
      LIMIT 1
    `;

    db.query(query, [mobile], async (err, results) => {
      if (err) {
        console.error('[ERROR] DB error during login:', err);
        return res.status(500).json({ success: false, message: 'DB error' });
      }
      if (results.length === 0) {
        return res.json({ success: false, message: 'User not found' });
      }

      const user = results[0];
      const hash = (user.password_hash || '').trim();
      const ok = hash && await bcrypt.compare(String(password).trim(), hash);
      if (!ok) {
        return res.json({ success: false, message: 'Incorrect password' });
      }

      // --- 2FA setup/verify flow ---
      if (user.two_fa_enabled && user['2fa_secret']) {
        return res.json({
          success: true,
          two_factor_required: true,
          can_regenerate_2fa: user.can_regenerate_2fa
        });
      } else if (user.two_fa_enabled && !user['2fa_secret']) {
        const secret = speakeasy.generateSecret({ name: `RO_CPQ:${user.email}` });
        db.query(
          'UPDATE ro_cpq.users SET `2fa_secret` = ? WHERE user_id = ?',
          [secret.base32, user.user_id],
          (updErr) => {
            if (updErr) {
              console.error('[ERROR] Could not update user with 2FA secret:', updErr);
              return res.status(500).json({ success: false, message: 'Could not update user with 2FA secret' });
            }
            qrcode.toDataURL(secret.otpauth_url, (qrErr, data_url) => {
              if (qrErr) {
                console.error('[ERROR] Could not generate QR code:', qrErr);
                return res.status(500).json({ success: false, message: 'Could not generate QR code' });
              }
              return res.json({ success: true, two_factor_setup: true, qr_code: data_url });
            });
          }
        );
        return;
      }

      // --- 2FA disabled → issue JWT and set cookie ---
      const token = jwt.sign(
        {
          user_id: user.user_id,
          userRole: user.role,
          userName: user.full_name,
          tenant_id: user.tenant_id,
        },
        process.env.JWT_SECRET || 'dev_secret',
        { expiresIn: process.env.JWT_EXPIRES || '8h' }
      );

      // ✅ Set persistent, httpOnly cookie so session survives page refresh
      res.cookie('auth_token', token, {
        httpOnly: true,
        sameSite: 'lax',     // or 'none' + secure:true if frontend is on another domain/HTTPS
        secure: false,       // true if using HTTPS in production
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      return res.json({
        success: true,
        token,
        userRole: user.role,
        userName: user.full_name,
        user_id: user.user_id,
        mobile: user.phone,
      });
    });
  });

  // --- 2FA verification route ---
  router.post('/verify', (req, res) => {
    const { mobile, token } = req.body;
    if (!mobile || !token) {
      return res.status(400).json({ success: false, message: 'Mobile and token are required.' });
    }

    const query = `
      SELECT *, tenant_id
      FROM ro_cpq.users
      WHERE phone = ?
      LIMIT 1
    `;

    db.query(query, [mobile], (err, results) => {
      if (err) {
        console.error('[ERROR] DB error during 2FA verification:', err);
        return res.status(500).json({ success: false, message: 'DB error' });
      }
      if (results.length === 0) {
        return res.json({ success: false, message: 'User not found' });
      }

      const user = results[0];
      const verified = speakeasy.totp.verify({
        secret: user['2fa_secret'],
        encoding: 'base32',
        token: String(token),
        window: 2
      });

      if (!verified) {
        return res.json({ success: false, message: 'Invalid 2FA token!!' });
      }

      const jwtToken = jwt.sign(
        {
          user_id: user.user_id,
          userRole: user.role,
          userName: user.full_name,
          tenant_id: user.tenant_id,
          mobile: user.phone,
        },
        process.env.JWT_SECRET || 'dev_secret',
        { expiresIn: process.env.JWT_EXPIRES || '8h' }
      );

      // ✅ Set cookie on successful 2FA verify
      res.cookie('auth_token', jwtToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      return res.json({
        success: true,
        token: jwtToken,
        userRole: user.role,
        userName: user.full_name,
        user_id: user.user_id,
        mobile: user.phone,
        can_regenerate_2fa: user.can_regenerate_2fa
      });
    });
  });

  // --- optional regenerate-2fa route (unchanged) ---
  router.post('/regenerate-2fa', (req, res) => {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ success: false, message: 'Mobile number is required.' });
    }
    const query = 'SELECT * FROM ro_cpq.users WHERE phone = ? LIMIT 1';
    db.query(query, [mobile], (err, results) => {
      if (err) {
        console.error('[ERROR] DB error during 2FA regeneration:', err);
        return res.status(500).json({ success: false, message: 'DB error' });
      }
      if (results.length === 0) {
        return res.json({ success: false, message: 'User not found' });
      }
      const user = results[0];
      const secret = speakeasy.generateSecret({ name: `RO_CPQ:${user.email}` });

      db.query('UPDATE ro_cpq.users SET `2fa_secret` = ? WHERE user_id = ?', [secret.base32, user.user_id], (updErr) => {
        if (updErr) {
          console.error('[ERROR] Could not update user with new 2FA secret:', updErr);
          return res.status(500).json({ success: false, message: 'Could not update user with new 2FA secret' });
        }
        qrcode.toDataURL(secret.otpauth_url, (qrErr, data_url) => {
          if (qrErr) {
            console.error('[ERROR] Could not generate new QR code:', qrErr);
            return res.status(500).json({ success: false, message: 'Could not generate new QR code' });
          }
          return res.json({ success: true, qr_code: data_url });
        });
      });
    });
  });

  return router;
};
