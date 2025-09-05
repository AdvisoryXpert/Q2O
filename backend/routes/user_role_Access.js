const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  // GET icon_labels for a specific role (tenant)
  router.get('/role-icons', (req, res) => {
    const { role } = req.query;
    const query = 'SELECT icon_label FROM ro_cpq.role_access WHERE role = ? AND tenant_id = ?';
    db.query(query, [role, req.tenant_id], (err, results) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results.map(row => row.icon_label));
    });
  });

  // Users list (tenant)
  router.get('/usersList', (req, res) => {
    const query = 'SELECT * FROM ro_cpq.users WHERE tenant_id = ?';
    db.query(query, [req.tenant_id], (err, results) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results);
    });
  });

  // GET user access (tenant)
  router.get('/user-access', (req, res) => {
    const { user_id } = req.query;
    const query = 'SELECT icon_label FROM ro_cpq.user_access WHERE user_id = ? AND tenant_id = ?';
    db.query(query, [user_id, req.tenant_id], (err, results) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results.map(row => row.icon_label));
    });
  });

  // Create User (tenant) — fixed missing can_regenerate_2fa variable
  router.post('/CreateUser', (req, res) => {
    const { full_name, email, phone, role, icon_labels, two_fa_enabled = 0, can_regenerate_2fa = 0 } = req.body;
    if (!full_name || !email || !phone || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const insertUserQuery = `
      INSERT INTO ro_cpq.users (tenant_id, full_name, email, phone, role, two_fa_enabled, can_regenerate_2fa, date_created)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    db.query(insertUserQuery, [req.tenant_id, full_name, email, phone, role, two_fa_enabled, can_regenerate_2fa], (err, result) => {
      if (err) {
        console.error('Error inserting user:', err);
        return res.status(500).json({ error: 'Database error during user creation' });
      }
      const user_id = result.insertId;

      if (Array.isArray(icon_labels) && icon_labels.length > 0) {
        const insertAccessQuery = `
          INSERT INTO ro_cpq.user_access (tenant_id, user_id, icon_label, role)
          VALUES ${icon_labels.map(() => '(?, ?, ?, ?)').join(', ')}
        `;
        const insertValues = icon_labels.flatMap((icon) => [req.tenant_id, user_id, icon, role]);
        db.query(insertAccessQuery, insertValues, (err) => {
          if (err) {
            console.error('Error inserting user access:', err);
            return res.status(500).json({ error: 'Database error during access insert' });
          }
          res.status(201).json({ user_id, message: 'User and access created successfully' });
        });
      } else {
        res.status(201).json({ user_id, message: 'User created with no access icons' });
      }
    });
  });

  // Update User + access (tenant)
  router.put('/updateUser', (req, res) => {
    const { user_id, full_name, email, phone, role, icon_labels, two_fa_enabled = 0, can_regenerate_2fa = 0 } = req.body;
    if (!user_id || !full_name || !email || !phone || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const updateUserQuery = `
      UPDATE ro_cpq.users
      SET full_name = ?, email = ?, phone = ?, role = ?, two_fa_enabled = ?, can_regenerate_2fa = ?
      WHERE user_id = ? AND tenant_id = ?
    `;
    db.query(updateUserQuery, [full_name, email, phone, role, two_fa_enabled, can_regenerate_2fa, user_id, req.tenant_id], (err) => {
      if (err) {
        console.error('Error updating user:', err);
        return res.status(500).json({ error: 'Database error during user update' });
      }

      const deleteAccessQuery = `DELETE FROM ro_cpq.user_access WHERE user_id = ? AND tenant_id = ?`;
      db.query(deleteAccessQuery, [user_id, req.tenant_id], (err) => {
        if (err) {
          console.error('Error deleting user access:', err);
          return res.status(500).json({ error: 'Database error while clearing user access' });
        }

        if (Array.isArray(icon_labels) && icon_labels.length > 0) {
          const insertQuery = `
            INSERT INTO ro_cpq.user_access (tenant_id, user_id, icon_label, role)
            VALUES ${icon_labels.map(() => '(?, ?, ?, ?)').join(', ')}
          `;
          const insertValues = icon_labels.flatMap((icon) => [req.tenant_id, user_id, icon, role]);

          db.query(insertQuery, insertValues, (err) => {
            if (err) {
              console.error('Error inserting user access:', err);
              return res.status(500).json({ error: 'Database error during access insert' });
            }
            res.json({ message: 'User and access updated successfully' });
          });
        } else {
          res.json({ message: 'User updated with no access icons' });
        }
      });
    });
  });

  // Save user access in one shot (tenant)
  router.post('/save-user-access', (req, res) => {
    const { user_id, role, icons } = req.body;

    const deleteQuery = 'DELETE FROM ro_cpq.user_access WHERE user_id = ? AND tenant_id = ?';
    db.query(deleteQuery, [user_id, req.tenant_id], (err) => {
      if (err) {
        console.error('Delete Error:', err);
        return res.status(500).json({ error: 'Delete failed' });
      }

      const insertQuery = 'INSERT INTO ro_cpq.user_access (tenant_id, user_id, role, icon_label) VALUES ?';
      const values = (icons || []).map(icon => [req.tenant_id, user_id, role, icon]);

      if (!values.length) return res.json({ message: 'No icons to insert' });

      db.query(insertQuery, [values], (err) => {
        if (err) {
          console.error('Insert Error:', err);
          return res.status(500).json({ error: 'Insert failed' });
        }
        res.json({ message: 'User access updated successfully' });
      });
    });
  });

  // Role access (tenant)
  router.get('/role-access', (req, res) => {
    db.query('SELECT * FROM ro_cpq.role_access WHERE tenant_id = ?', [req.tenant_id], (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    });
  });

  router.post('/role-access', (req, res) => {
    const { role, icon_label } = req.body;
    if (!role || !icon_label) return res.status(400).json({ error: 'Missing fields' });

    db.query('INSERT INTO ro_cpq.role_access (tenant_id, role, icon_label) VALUES (?, ?, ?)',
      [req.tenant_id, role, icon_label],
      (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: 'Inserted', id: result.insertId });
      });
  });

  router.put('/role-access/:id', (req, res) => {
    const { role, icon_label } = req.body;
    if (!role || !icon_label) return res.status(400).json({ error: 'Missing fields' });

    db.query('UPDATE ro_cpq.role_access SET role = ?, icon_label = ? WHERE id = ? AND tenant_id = ?',
      [role, icon_label, req.params.id, req.tenant_id],
      (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: 'Updated' });
      });
  });

  router.delete('/role-access/:id', (req, res) => {
    db.query('DELETE FROM ro_cpq.role_access WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.tenant_id],
      (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: 'Deleted' });
      });
  });

  return router;
};
