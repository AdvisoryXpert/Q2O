const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  // GET icon_labels for a specific role
  router.get('/role-icons', (req, res) => {
    const { role } = req.query;

    const query = 'SELECT icon_label FROM role_access WHERE role = ?';

    db.query(query, [role], (err, results) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results.map(row => row.icon_label));
    });
  });

  // routes
router.get('/usersList', (req, res) => {
  const query = 'SELECT * FROM users';
  db.query(query, (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results); // Send full user rows
  });
});

  // GET user access (icon_labels assigned to a user)
  router.get('/user-access', (req, res) => {
    const { user_id } = req.query;

    const query = 'SELECT icon_label FROM user_access WHERE user_id = ?';

    db.query(query, [user_id], (err, results) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results.map(row => row.icon_label));
    });
  });

  router.post('/CreateUser', (req, res) => {
    const { full_name, email, phone, role, icon_labels, two_fa_enabled } = req.body;
  
    if (!full_name || !email || !phone || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
  
    // Step 1: Insert user
    const insertUserQuery = `
      INSERT INTO users (full_name, email, phone, role, two_fa_enabled, date_created)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
  
    db.query(insertUserQuery, [full_name, email, phone, role, two_fa_enabled, can_regenerate_2fa], (err, result) => {
      if (err) {
        console.error('Error inserting user:', err);
        return res.status(500).json({ error: 'Database error during user creation' });
      }
  
      const user_id = result.insertId;
  
      // Step 2: Insert user access icons
      if (Array.isArray(icon_labels) && icon_labels.length > 0) {
        const insertAccessQuery = `
          INSERT INTO user_access (user_id, icon_label, role)
          VALUES ${icon_labels.map(() => '(?, ?, ?)').join(', ')}
        `;
        const insertValues = icon_labels.flatMap((icon) => [user_id, icon, role]);
  
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
  
  router.put('/updateUser', (req, res) => {
    const { user_id, full_name, email, phone, role, icon_labels, two_fa_enabled, can_regenerate_2fa } = req.body;
  
    if (!user_id || !full_name || !email || !phone || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
  
    // Step 1: Update user details
    const updateUserQuery = `
      UPDATE users
      SET full_name = ?, email = ?, phone = ?, role = ?, two_fa_enabled = ?, can_regenerate_2fa = ?
      WHERE user_id = ?
    `;
  
    db.query(updateUserQuery, [full_name, email, phone, role, two_fa_enabled, can_regenerate_2fa, user_id], (err) => {
      if (err) {
        console.error('Error updating user:', err);
        return res.status(500).json({ error: 'Database error during user update' });
      }
  
      // Step 2: Remove existing access
      const deleteAccessQuery = `DELETE FROM user_access WHERE user_id = ?`;
      db.query(deleteAccessQuery, [user_id], (err) => {
        if (err) {
          console.error('Error deleting user access:', err);
          return res.status(500).json({ error: 'Database error while clearing user access' });
        }
  
        // Step 3: Insert new access icons (if any)
        if (Array.isArray(icon_labels) && icon_labels.length > 0) {
          const insertQuery = `
            INSERT INTO user_access (user_id, icon_label, role)
            VALUES ${icon_labels.map(() => '(?, ?, ?)').join(', ')}
          `;
          const insertValues = icon_labels.flatMap((icon) => [user_id, icon, role]);
  
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
  
  // POST to save/update user access (role + icon_labels)
  router.post('/save-user-access', (req, res) => {
    const { user_id, role, icons } = req.body;

    // Delete old access for the user
    const deleteQuery = 'DELETE FROM user_access WHERE user_id = ?';

    db.query(deleteQuery, [user_id], (err) => {
      if (err) {
        console.error('Delete Error:', err);
        return res.status(500).json({ error: 'Delete failed' });
      }

      // Insert new user access (role + icon_labels)
      const insertQuery = 'INSERT INTO user_access (user_id, role, icon_label) VALUES ?';
      const values = icons.map(icon => [user_id, role, icon]);

      db.query(insertQuery, [values], (err) => {
        if (err) {
          console.error('Insert Error:', err);
          return res.status(500).json({ error: 'Insert failed' });
        }
        res.json({ message: 'User access updated successfully' });
      });
    });
  });

  // GET all role access records
router.get('/role-access', (req, res) => {
  db.query('SELECT * FROM ro_cpq.role_access', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// POST new role access record
router.post('/role-access', (req, res) => {
  const { role, icon_label } = req.body;
  if (!role || !icon_label) return res.status(400).json({ error: 'Missing fields' });

  db.query('INSERT INTO ro_cpq.role_access (role, icon_label) VALUES (?, ?)',
    [role, icon_label],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: 'Inserted', id: result.insertId });
    });
});

// PUT update a role access record by ID
router.put('/role-access/:id', (req, res) => {
  const { role, icon_label } = req.body;
  if (!role || !icon_label) return res.status(400).json({ error: 'Missing fields' });

  db.query('UPDATE ro_cpq.role_access SET role = ?, icon_label = ? WHERE id = ?',
    [role, icon_label, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: 'Updated' });
    });
});

// DELETE a role access record by ID
router.delete('/role-access/:id', (req, res) => {
  db.query('DELETE FROM ro_cpq.role_access WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Deleted' });
  });
});
   return router;
};
