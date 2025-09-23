const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
    const tenantId = req.tenant_id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sql = `
        -- Fetch existing follow-ups
        SELECT
            d.dealer_id,
            d.full_name AS dealer_name,
            d.is_important,
            'follow-up' as type,
            fu.entity_type,
            fu.due_date,
            fu.status
        FROM
            ro_cpq.follow_ups fu
        JOIN
            ro_cpq.dealer d ON fu.tenant_id = d.tenant_id AND (
                (fu.entity_type = 'quote' AND fu.entity_id IN (SELECT quote_id FROM ro_cpq.quotation WHERE dealer_id = d.dealer_id)) OR
                (fu.entity_type = 'order' AND fu.entity_id IN (SELECT order_id FROM ro_cpq.orders WHERE dealer_id = d.dealer_id)) OR
                (fu.entity_type = 'sr' AND fu.entity_id IN (SELECT id FROM ro_cpq.service_requests WHERE dealer_id = d.dealer_id))
            )
        WHERE
            fu.tenant_id = ?

        UNION

        -- Fetch entities that don't have a follow-up
        SELECT
            d.dealer_id,
            d.full_name AS dealer_name,
            d.is_important,
            e.type,
            e.type as entity_type,
            e.date_created as due_date,
            e.status
        FROM (
            SELECT 'order' as type, o.order_id as id, o.date_created, o.status, o.dealer_id, o.tenant_id
            FROM ro_cpq.orders o
            WHERE o.status IN ('Pending', 'For Dispatch')

            UNION ALL

            SELECT 'quote' as type, q.quote_id as id, q.date_created, q.status, q.dealer_id, q.tenant_id
            FROM ro_cpq.quotation q

            UNION ALL

            SELECT 'sr' as type, sr.id as id, sr.created_at as date_created, sr.status, sr.dealer_id, sr.tenant_id
            FROM ro_cpq.service_requests sr
        ) e
        JOIN
            ro_cpq.dealer d ON e.dealer_id = d.dealer_id AND e.tenant_id = d.tenant_id
        WHERE
            e.tenant_id = ?
            AND NOT EXISTS (
                SELECT 1
                FROM ro_cpq.follow_ups fu
                WHERE fu.tenant_id = e.tenant_id
                  AND fu.entity_type = e.type
                  AND fu.entity_id = e.id
            )
    `;

    db.query(sql, [tenantId, tenantId], (err, results) => {
        if (err) {
            console.error('Error fetching dealer follow-ups:', err);
            return res.status(500).json({ error: 'Failed to fetch dealer follow-ups' });
        }

        const aggregatedFollowUps = {};

        results.forEach(row => {
            const { dealer_id, dealer_name, is_important, entity_type, due_date, status } = row;
            const dueDate = new Date(due_date);
            dueDate.setHours(0, 0, 0, 0);

            const days_pending = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
            const is_overdue = dueDate < today && status !== 'Completed';

            if (!aggregatedFollowUps[dealer_id]) {
                aggregatedFollowUps[dealer_id] = {
                    dealer_name: dealer_name,
                    is_important: is_important,
                    follow_ups: {
                        quote: [],
                        order: [],
                        sr: []
                    },
                    max_days_pending: 0
                };
            }

            if (!aggregatedFollowUps[dealer_id].follow_ups[entity_type]) {
                aggregatedFollowUps[dealer_id].follow_ups[entity_type] = [];
            }

            aggregatedFollowUps[dealer_id].follow_ups[entity_type].push({
                due_date: due_date,
                status: status,
                days_pending: days_pending,
                is_overdue: is_overdue
            });

            if (days_pending > aggregatedFollowUps[dealer_id].max_days_pending) {
                aggregatedFollowUps[dealer_id].max_days_pending = days_pending;
            }
        });

        const sortedDealers = Object.values(aggregatedFollowUps).sort((a, b) => b.max_days_pending - a.max_days_pending);

        res.json(sortedDealers);
    });
});

module.exports = router;
