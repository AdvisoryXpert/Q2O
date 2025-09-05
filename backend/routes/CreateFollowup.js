// routes/CreateFollowup.js
const db = require('../db');

// BREAKING (small): add tenant_id param as the first arg
function createFollowup(tenant_id, entity_type, entity_id, assigned_to, created_by, due_date = null, notes = null) {
  const followup_id = `FU-${Date.now()}`;
  const sql = `
    INSERT INTO ro_cpq.follow_ups
      (tenant_id, followup_id, entity_type, entity_id, assigned_to, created_by, due_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [tenant_id, followup_id, entity_type, entity_id, assigned_to, created_by, due_date, notes],
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
