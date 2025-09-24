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
            fu.entity_id,
            fu.followup_id,
            fu.due_date,
            fu.status
        FROM ro_cpq.follow_ups fu
        LEFT JOIN ro_cpq.quotation q ON fu.entity_type = 'quote' AND fu.entity_id = q.quote_id
        LEFT JOIN ro_cpq.orders o ON fu.entity_type = 'order' AND fu.entity_id = o.order_id
        LEFT JOIN ro_cpq.service_requests sr ON fu.entity_type = 'sr' AND fu.entity_id = sr.id
        LEFT JOIN ro_cpq.dealer d ON d.dealer_id = COALESCE(q.dealer_id, o.dealer_id, sr.dealer_id)
        WHERE fu.tenant_id = ? AND d.dealer_id IS NOT NULL

        UNION

        -- Fetch entities that don't have a follow-up
        SELECT
            d.dealer_id,
            d.full_name AS dealer_name,
            d.is_important,
            e.type,
            e.type as entity_type,
            e.id as entity_id,
            NULL as followup_id,
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
            WHERE sr.status IN ('Open', 'In Progress', 'Pending')
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
            const { dealer_id, dealer_name, is_important, entity_type, entity_id, followup_id, due_date, status } = row;
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

            if (entity_type === 'lr') return;

            if (!aggregatedFollowUps[dealer_id].follow_ups[entity_type]) {
                aggregatedFollowUps[dealer_id].follow_ups[entity_type] = [];
            }

            aggregatedFollowUps[dealer_id].follow_ups[entity_type].push({
                entity_id: entity_id,
                followup_id: followup_id,
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