// routes/createFollowup.js
const db = require('../db');

function createFollowup(entity_type, entity_id, assigned_to, created_by, due_date = null, notes = null) {
  const followup_id = `FU-${Date.now()}`;
  const sql = `
    INSERT INTO follow_ups
    (followup_id, entity_type, entity_id, assigned_to, created_by, due_date, notes)
    VALUES (?, ?, ?, ?, ?, NOW(), ?)
  `;

  db.query(
    sql,
    [followup_id, entity_type, entity_id, assigned_to, created_by, due_date, notes],
    (err) => {
      if (err) {
        console.error('❌ Error creating follow-up:', err);
      } else {
        console.log(`✅ Follow-up created for ${entity_type} ${entity_id}`);
      }
    }
  );
}

module.exports = createFollowup;
