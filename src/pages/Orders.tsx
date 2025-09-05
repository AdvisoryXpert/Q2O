import React, { useEffect, useState } from 'react';
import {
	Box,
	Typography,
	Table,
	TableHead,
	TableRow,
	TableCell,
	TableBody,
	TableContainer,
	Paper,
	Button,
	TablePagination
} from '@mui/material';
import TopAppBar from '../navBars/topAppBar';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavAccess } from '../navBars/navBars';
import App from '../App';
import { http } from '../lib/http';
import { useNavigate } from 'react-router-dom'; // ✅ Added import for navigate

type Order = {
  order_id: number;
  customer_name: string;
  dealer_id: number;
  date_created: string;
  status: string;
  invoice_id?: string;
};

type Dealer = {
  dealer_id: number;
  full_name: string;
};

const OrderListPage = () => {
	const [orders, setOrders] = useState<Order[]>([]);
	const [dealers, setDealers] = useState<Dealer[]>([]);
	const navItems = useNavAccess();
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const navigate = useNavigate(); // ✅ Defined navigate

	useEffect(() => {
		const fetchOrders = async () => {
			try {
				const res = await http.get('/recentorders');
				setOrders(res.data);
			} catch (err) {
				console.error('Error fetching orders', err);
			}
		};

		const fetchDealers = async () => {
			try {
				const res = await http.get('/dealers');
				setDealers(res.data);
			} catch (err) {
				console.error('Error fetching dealers', err);
			}
		};

		fetchOrders();
		fetchDealers();
	}, []);

	const getDealerName = (dealerId: number) => {
		const dealer = dealers.find((d) => d.dealer_id === dealerId);
		return dealer ? dealer.full_name : dealerId;
	};

	const handleChangePage = (_event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	const paginatedOrders = orders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

	return (
		<Box sx={{ padding: 4, backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
			<TopAppBar navItems={navItems} />
			<Paper elevation={3} sx={{ padding: 3, borderRadius: 2 }}>
				<Typography variant="h4" gutterBottom>
					Recent Orders
				</Typography>

				<TableContainer>
					<Table>
						<TableHead>
							<TableRow>
								<TableCell>Order ID</TableCell>
								<TableCell>Dealer</TableCell>
								<TableCell>Date</TableCell>
								<TableCell>Status</TableCell>
								<TableCell>Invoice ID</TableCell>
								<TableCell>Save</TableCell>
								<TableCell>Action</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{paginatedOrders.map((order) => (
								<TableRow key={order.order_id}>
									<TableCell>{order.order_id}</TableCell>
									<TableCell>{getDealerName(order.dealer_id)}</TableCell>
									<TableCell>{new Date(order.date_created).toLocaleDateString()}</TableCell>
									<TableCell>{order.status}</TableCell>

									<TableCell>
										<input
											type="text"
											value={order.invoice_id || ""}
											onChange={(e) => {
												const updatedOrders = [...orders];
												const globalIndex = orders.findIndex(o =>
													o.order_id === order.order_id);
												if (globalIndex !== -1) {
													updatedOrders[globalIndex] = {
														...updatedOrders[globalIndex],
														invoice_id: e.target.value,
													};
													setOrders(updatedOrders);
												}
											}}
											style={{ width: "100px" }}
										/>
									</TableCell>

									<TableCell>
										<Button
											variant="outlined"
											color="success"
											onClick={async () => {
												try {
													const response = await http.post('/update-invoice-id', {
														order_id: order.order_id,
														invoice_id: order.invoice_id ?? "",
													});

													const result = response.data;
													if (!result.success) {
														alert("❌ Failed to save invoice ID");
													} else {
														alert("✅ Invoice ID saved");
													}
												} catch (error) {
													alert("❌ Error saving invoice ID");
													console.error(error);
												}
											}}
										>
											Save
										</Button>
									</TableCell>

									<TableCell>
										<Button
											variant="contained"
											color="primary"
											startIcon={<VisibilityIcon />}
											onClick={() => navigate(`/orders/${order.order_id}`)}
										>
											Check Order Lines
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>

				<TablePagination
					component="div"
					count={orders.length}
					page={page}
					onPageChange={handleChangePage}
					rowsPerPage={rowsPerPage}
					onRowsPerPageChange={handleChangeRowsPerPage}
					rowsPerPageOptions={[10, 20, 50]}
					sx={{ mt: 2 }}
				/>
			</Paper>
			<App />
		</Box>
	);
};

export default OrderListPage;
