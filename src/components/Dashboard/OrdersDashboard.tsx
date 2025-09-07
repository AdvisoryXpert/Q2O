import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { http } from '../../lib/http';

type Order = {
  order_id: number;
  customer_name: string;
  date_created: string;
  status: string;
};

const OrdersDashboard = () => {
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			try {
				setLoading(true);
				const { data } = await http.get('/orders/last-month');
				setOrders(data ?? []);
				setError(null);
			} catch {
				setError('Failed to load orders.');
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	return (
		<Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
			<Typography variant="h6" sx={{ mb: 2 }}>Orders in the Last Month</Typography>
			{loading && <Typography>Loading...</Typography>}
			{error && <Typography color="error">{error}</Typography>}
			{!loading && !error && (
				<Box>
					{orders.map((order) => (
						<Box key={order.order_id} sx={{ mb: 1 }}>
							<Typography variant="body1">{order.customer_name}</Typography>
							<Typography variant="body2" color="text.secondary">{new Date(order.date_created).toLocaleDateString()}</Typography>
						</Box>
					))}
				</Box>
			)}
		</Paper>
	);
};

export default OrdersDashboard;
