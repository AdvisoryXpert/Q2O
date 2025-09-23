import React, { useEffect, useState } from 'react';
import TopAppBar from '../navBars/topAppBar';
import { useNavAccess } from '../navBars/navBars';
import {
	Box,
	Typography,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	TablePagination,
} from '@mui/material';
import { http } from '../lib/http'; 
import { useParams } from 'react-router-dom';

const OrderDispatchPOSView = () => {
	const { orderId } = useParams();
	const [orderHeader, setOrderHeader] = useState<any | null>(null);
	const [orderLines, setOrderLines] = useState<any[]>([]);
	const [, setLoading] = useState<boolean>(true);
	const [, setError] = useState<string>('');
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(5);

	useEffect(() => {
		const fetchOrderDetails = async () => {
			try {
				const res = await http.get(`/orders_pos/${orderId}`);
				const data = res.data;
				setOrderHeader(data);
				setOrderLines(data.line_items);
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

	const navItems = useNavAccess();

	return (
		<>
			<TopAppBar navItems={navItems} />
			<Box sx={{ mt: 10, mb: 10, px: 4 }}>
				<Typography variant="h5" gutterBottom>
					Order Dispatch Summary (POS)
				</Typography>

				{orderHeader && (
					<TableContainer component={Paper} sx={{ mb: 4, border: '1px solid #90caf9', 
						borderRadius: 2, backgroundColor: '#e3f2fd' }}>
						<Table size="small">
							<TableHead>
								<TableRow><TableCell colSpan={2}><strong>Order Header</strong></TableCell></TableRow>
							</TableHead>
							<TableBody>
								<TableRow><TableCell>Order ID</TableCell><TableCell>
									{orderHeader.order_id}</TableCell></TableRow>
								<TableRow><TableCell>Status</TableCell><TableCell>
									{orderHeader.status}</TableCell></TableRow>
								<TableRow><TableCell>Dealer</TableCell><TableCell>
									{orderHeader.dealer_name}</TableCell></TableRow>
								<TableRow><TableCell>Date</TableCell><TableCell>
									{new Date(orderHeader.date_created).toLocaleString()}</TableCell></TableRow>
								<TableRow><TableCell>Total</TableCell><TableCell>
									₹{orderHeader.total_price}</TableCell></TableRow>
							</TableBody>
						</Table>
					</TableContainer>
				)}

				<Typography variant="h6" gutterBottom>Order Line Items</Typography>
				{orderLines.length > 0 ? (
					<TableContainer component={Paper} sx={{ border: '1px solid #90caf9', borderRadius: 2 }}>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Product</TableCell>
									<TableCell>Variant</TableCell>
									<TableCell>Qty</TableCell>
									<TableCell>Unit Price</TableCell>
									<TableCell>Total</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{orderLines.slice
								(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((item, idx) => (
									<TableRow key={idx} hover>
										<TableCell>{item.product_name}</TableCell>
										<TableCell>{item.attribute_name}</TableCell>
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
					<Typography>No line items found.</Typography>
				)}
			</Box>
		</>
	);
};

export default OrderDispatchPOSView;
