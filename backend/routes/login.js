// routes/login.js
const express = require('express');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const router = express.Router();

module.exports = (db) => {
	router.post("/", (req, res) => {
		const { mobile, password } = req.body;

		if (!mobile || !password) {
			return res.status(400).json({ success: false, message: "Mobile and password are required." });
		}

		const query = "SELECT *, two_fa_enabled, can_regenerate_2fa FROM ro_cpq.users WHERE phone = ?";

		db.query(query, [mobile], async (err, results) => {
			if (err) {
				console.error('[ERROR] DB error during login:', err);
				return res.status(500).json({ success: false, message: "DB error" });
			}

			if (results.length === 0) {
				console.warn('[LOGIN FAILED] Invalid mobile:', mobile);
				return res.json({ success: false, message: "User not found" });
			}

			const user = results[0];
			const isMatch = await bcrypt.compare(password.trim(), user.password_hash.trim());

			if (!isMatch) {
				console.warn('[LOGIN FAILED] Incorrect password for:', mobile);
				return res.json({ success: false, message: "Incorrect password" });
			}

			// 2FA logic
			if (user.two_fa_enabled && user['2fa_secret']) {
				// User has 2FA enabled, prompt for token
				return res.json({ success: true, two_factor_required: true, can_regenerate_2fa: user.can_regenerate_2fa });
			} else if (user.two_fa_enabled && !user['2fa_secret']) {
				// 2FA is enabled but not set up, initiate setup
				const secret = speakeasy.generateSecret({ name: `RO_CPQ:${user.email}` });
				db.query('UPDATE ro_cpq.users SET 2fa_secret = ? WHERE user_id = ?', [secret.base32, user.user_id], (err) => {
					if (err) {
						console.error('[ERROR] Could not update user with 2FA secret:', err);
						return res.status(500).json({ success: false, message: 'Could not update user with 2FA secret' });
					}
					qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
						if (err) {
							console.error('[ERROR] Could not generate QR code:', err);
							return res.status(500).json({ success: false, message: 'Could not generate QR code' });
						}
						return res.json({ success: true, two_factor_setup: true, qr_code: data_url });
					});
				});
			} else {
				req.session.regenerate((err) => {
                    if (err) {
                        console.error('Session regeneration error:', err);
                        return res.status(500).json({ success: false, message: 'Error regenerating session' });
                    }
    				// 2FA is disabled, proceed with login
    				req.session.user_id = user.user_id;
    				req.session.userMobile = user.phone;
    				req.session.userRole = user.role;
    				req.session.userName = user.full_name;
    				req.session.save((err) => {
    					if (err) console.error('Session save error:', err);
    					console.log('Login success: req.session.user_id set to','user.user_id',user.user_id, 'req.session.user_id', req.session.user_id);
    					return res.json({
    						success: true,
    						userRole: user.role,
    						userName: user.full_name,
    						user_id: user.user_id,
    					});
    				});
                });
			}
		});
	});

	router.post("/verify", (req, res) => {
		const { mobile, token } = req.body;

		if (!mobile || !token) {
			return res.status(400).json({ success: false, message: "Mobile and token are required." });
		}

		const query = "SELECT * FROM ro_cpq.users WHERE phone = ?";

		db.query(query, [mobile], (err, results) => {
			if (err) {
				console.error('[ERROR] DB error during 2FA verification:', err);
				return res.status(500).json({ success: false, message: "DB error" });
			}

			if (results.length === 0) {
				return res.json({ success: false, message: "User not found" });
			}

			const user = results[0];

			const verified = speakeasy.totp.verify({
				secret: user['2fa_secret'],
				encoding: 'base32',
				token: token,
				window: 6
			});

			if (verified) {
				console.log('[2FA SUCCESS] for user:', user.full_name);
                req.session.regenerate((err) => {
                    if (err) {
                        console.error('Session regeneration error:', err);
                        return res.status(500).json({ success: false, message: 'Error regenerating session' });
                    }
    			    req.session.user_id = user.user_id;
    			    req.session.userMobile = user.phone;
    			    req.session.userRole = user.role;
    			    req.session.userName = user.full_name;
    				req.session.save((err) => {
    					if (err) console.error('Session save error:', err);
    					return res.json({
    						success: true,
    						userRole: user.role,
    						userName: user.full_name,
    						user_id: user.user_id,
							can_regenerate_2fa: user.can_regenerate_2fa
    					});
    				});
                });
			} else {
				console.warn('[2FA FAILED] for user:', user.full_name);
				return res.json({ success: false, message: 'Invalid 2FA token!!' });
			}
		});
	});

	router.post("/regenerate-2fa", (req, res) => {
		const { mobile } = req.body;

		if (!mobile) {
			return res.status(400).json({ success: false, message: "Mobile number is required." });
		}

		const query = "SELECT * FROM ro_cpq.users WHERE phone = ?";
		db.query(query, [mobile], (err, results) => {
			if (err) {
				console.error('[ERROR] DB error during 2FA regeneration:', err);
				return res.status(500).json({ success: false, message: "DB error" });
			}

			if (results.length === 0) {
				return res.json({ success: false, message: "User not found" });
			}

			const user = results[0];
			const secret = speakeasy.generateSecret({ name: `RO_CPQ:${user.email}` });

			db.query('UPDATE ro_cpq.users SET `2fa_secret` = ? WHERE user_id = ?', [secret.base32, user.user_id], (err) => {
				if (err) {
					console.error('[ERROR] Could not update user with new 2FA secret:', err);
					return res.status(500).json({ success: false, message: 'Could not update user with new 2FA secret' });
				}
				qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
					if (err) {
						console.error('[ERROR] Could not generate new QR code:', err);
						return res.status(500).json({ success: false, message: 'Could not generate new QR code' });
					}
					return res.json({ success: true, qr_code: data_url });
				});
			});
		});
	});

	return router;
};