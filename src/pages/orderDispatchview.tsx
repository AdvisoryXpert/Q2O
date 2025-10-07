import React, { useEffect, useState } from 'react';
import {
	Box,
	Typography,
	Button,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	TablePagination,
	Toolbar,
} from '@mui/material';
import { http } from '../lib/http'; 
import { useParams, useNavigate } from 'react-router-dom';

const OrderDispatchView = () => {
	const { orderId } = useParams();
	const [orderHeader, setOrderHeader] = useState<any | null>(null);
	const [orderLines, setOrderLines] = useState<any[]>([]);
	const [, setLoading] = useState<boolean>(true);
	const [, setError] = useState<string>('');
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(5);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchOrderDetails = async () => {
			try {
				const res = await http.get(`/dispatchorders/order-details/${orderId}`);
				const data = res.data;
				setOrderHeader(data.header);
				console.log('Fetched line items:', data.lineItems);
				setOrderLines(data.lineItems);
				setLoading(false);
			} catch (err) {
				console.error('Error fetching order details:', err);
				setError('Failed to fetch order details');
				setLoading(false);
			}
		};

		fetchOrderDetails();
	}, [orderId]);

	const handleChangePage = (event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	return (
		<Box sx={{ p: 3 }}>
			<Toolbar />
			<Typography variant="h5" gutterBottom>
				Order Dispatch Summary
			</Typography>

			{orderHeader && (
				<TableContainer component={Paper} 
					sx={{ mb: 4, border: '1px solid #90caf9', borderRadius: 2, backgroundColor: '#e3f2fd' }}>
					<Table stickyHeader size="small" 
						sx={{ '& tbody tr:hover': 
              { backgroundColor: '#f5f5f5' }, '& th': { backgroundColor: '#eeeeee' } }}>
						<TableHead>
							<TableRow>
								<TableCell colSpan={2}><strong>Order Header</strong></TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							<TableRow>
								<TableCell>Order ID</TableCell>
								<TableCell>{orderHeader.order_id}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell>Quote ID</TableCell>
								<TableCell>{orderHeader.quote_id}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell>Status</TableCell>
								<TableCell>
									<Box display="inline-flex">
										<Box
											component="span"
											sx={{
												backgroundColor: 
                        orderHeader.status === 'Dispatched' ? '#fbc02d' : '#1976d2',
												color: '#fff',
												px: 2,
												py: 0.5,
												borderRadius: 2,
												fontWeight: 'bold',
												fontSize: '0.8rem'
											}}
										>
											{orderHeader.status}
										</Box>
									</Box>
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell>Customer Name</TableCell>
								<TableCell>{orderHeader.customer_name}</TableCell>
							</TableRow>
						</TableBody>
						<TableBody>
							<TableRow sx={{ backgroundColor: '#1565c0' }}>
								<TableCell colSpan={3} align="right">
									<Typography variant="subtitle1" fontWeight="bold" 
										color="#ffffff">Gross Total</Typography>
								</TableCell>
								<TableCell>
									<Typography variant="subtitle1" fontWeight="bold" color="white">
										₹{
											orderLines.reduce((sum, item) =>
												sum + (item.total_price || 0), 0).toLocaleString('en-IN')
										}
									</Typography>
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</TableContainer>
			)}

			<Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Order Line Items</Typography>
			{orderLines.length > 0 ? (
				<TableContainer component={Paper} 
					sx={{ border: '1px solid #90caf9', borderRadius: 2, 
						overflow: 'hidden', backgroundColor: '#fafafa' }}>
					<Table>
						<TableHead>
							<TableRow>
								<TableCell><strong>🛒 Product</strong></TableCell>
								<TableCell><strong>🔢 Quantity</strong></TableCell>
								<TableCell><strong>💰 Unit Price</strong></TableCell>
								<TableCell><strong>🧾 Total</strong></TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{orderLines.slice
							(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((item, idx) => (
								<TableRow key={idx} hover>
									<TableCell>{item.product_name}</TableCell>
									<TableCell>{item.quantity}</TableCell>
									<TableCell>₹{item.unit_price}</TableCell>
									<TableCell>₹{item.total_price}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					<TablePagination
						component="div"
						count={orderLines.length}
						page={page}
						onPageChange={handleChangePage}
						rowsPerPage={rowsPerPage}
						onRowsPerPageChange={handleChangeRowsPerPage}
					/>
				</TableContainer>
			) : (
				<Typography variant="body1" sx={{ mt: 2 }}>
					No line items available for this order.
				</Typography>
			)}

			<Button
				variant="contained"
				sx={{ mt: 4 }}
				onClick={() => navigate(`/quotation-items/${orderHeader.quote_id}`)}
				disabled={!orderHeader}
			>
				Back to Quotes
			</Button>
		</Box>
	);
};

export default OrderDispatchView;
