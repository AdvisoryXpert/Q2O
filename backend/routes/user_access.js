// routes/user_access.js
const express = require('express');
const router = express.Router();

module.exports = (db) => {
	// Helper function to fetch role-based access
	const fallbackToRoleAccess = (role, res) => {
		const roleAccessSQL = 'SELECT icon_label FROM role_access WHERE role = ?';
		//console.log('[SQL] Fetching role-based access:', roleAccessSQL, [role]);

		db.query(roleAccessSQL, [role], (err, roleResult) => {
			if (err) {
				console.error('[ERROR] Fetching role access:', err);
				return res.status(500).json({ error: 'DB error' });
			}
			const accessList = roleResult.map(row => row.icon_label);
			//console.log('[SUCCESS] Role-based access found:', accessList);
			return res.json({ access: accessList });
		});
	};

	// Main route
	router.get('/', (req, res) => {
		const { mobile, role } = req.query;

		//console.log('[REQUEST] /api/user-access');
		//console.log('Received query params:', { mobile, role });

		if (!mobile || !role) {
			console.warn('[VALIDATION] Missing mobile or role');
			return res.status(400).json({ error: 'Missing mobile or role parameter' });
		}

		const getUserIdSQL = 'SELECT user_id FROM users WHERE phone = ?';
		//console.log('[SQL] Fetching user_id:', getUserIdSQL, [mobile]);

		db.query(getUserIdSQL, [mobile], (err, userResult) => {
			if (err) {
				console.error('[ERROR] Fetching user ID:', err);
				return res.status(500).json({ error: 'DB error' });
			}

			//console.log('[RESULT] User lookup result:', userResult);

			if (userResult.length === 0) {
				console.warn('[WARN] No user found for mobile:', mobile);
				return fallbackToRoleAccess(role, res);
			}

			const userId = userResult[0].user_id;
			//console.log('[DEBUG] Found userId:', userId);

			const userAccessSQL = 'SELECT icon_label FROM user_access WHERE user_id = ?';
			//console.log('[SQL] Fetching user-specific access:', userAccessSQL, [userId]);

			db.query(userAccessSQL, [userId], (err, accessResult) => {
				if (err) {
					console.error('[ERROR] Fetching user-specific access:', err);
					return res.status(500).json({ error: 'DB error' });
				}

				//('[RESULT] User access result:', accessResult);

				if (accessResult.length > 0) {
					const accessList = accessResult.map(row => row.icon_label);
					//console.log('[SUCCESS] User-specific access found:', accessList);
					return res.json({ access: accessList });
				}

				console.warn('[FALLBACK] No user-specific access found, using role access');
				return fallbackToRoleAccess(role, res);
			});
		});
	});

	return router;
};
