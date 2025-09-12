
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Paper, Typography, useTheme } from '@mui/material';
import { http } from '../../lib/http';

const OrderStatusGraph: React.FC = () => {
	const theme = useTheme();
	const [data, setData] = useState([]);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const response = await http.get('/orders/status-overview');
				setData(response.data);
			} catch (error) {
				console.error('Failed to fetch order status overview:', error);
			}
		};

		fetchData();
	}, []);

	return (
		<Paper elevation={3} sx={{ p: 2, mb: 2 }}>
			<Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: theme.palette.primary.dark }}>
				Order Status
			</Typography>
			<ResponsiveContainer width="100%" height={300}>
				<BarChart data={data}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="status" />
					<YAxis />
					<Tooltip />
					<Legend />
					<Bar dataKey="count" fill={theme.palette.primary.main} />
				</BarChart>
			</ResponsiveContainer>
		</Paper>
	);
};
export default OrderStatusGraph;
