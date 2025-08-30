const activityLogger = (db) => {
    return (req, res, next) => {
        // Only log if user is authenticated and user_id is available
        if (req.session && req.session.user_id) {
            const { user_id } = req.session;
            const ip_address = req.ip; // Express provides req.ip
            const device_info = req.headers['user-agent'];
            const page_accessed = req.originalUrl;
            const event_type = 'page_view'; // Default event type for general page access

            // Basic location placeholder (can be replaced with a geo-IP service)
            const location = 'Unknown'; 

            const query = `
                INSERT INTO ro_cpq.user_activity_logs 
                (user_id, ip_address, device_info, location, page_accessed, event_type, session_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            // Use a placeholder for session_id for now, or generate a unique one
            const session_id = req.sessionID || 'N/A'; 

            db.query(query, [user_id, ip_address, device_info, location, page_accessed, event_type, session_id], (err) => {
                if (err) {
                    console.error('Error logging user activity:', err);
                } 
            });
        }
        next(); // Continue to the next middleware/route handler
    };
};

module.exports = activityLogger;