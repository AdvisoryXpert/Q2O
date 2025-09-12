import { useEffect, useMemo, useState } from "react";
import {
	AppBar,
	Box,
	Button,
	Card,
	CardContent,
	Grid,
	IconButton,
	Paper,
	TextField,
	Toolbar,
	Typography,
	useMediaQuery,
	useTheme,
	Snackbar,
	Alert,
} from "@mui/material";
import {
	DataGrid,
	GridColDef,
} from "@mui/x-data-grid";
import { useParams, useNavigate } from "react-router-dom";
import { http } from "../lib/http";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

/** Types */
type Order = {
  order_id: number;
  customer_name: string;
  dealer_id: number;
  dealer_name: string;
  date_created: string;
  status: string;
  invoice_id?: string;
};

type OrderLineItem = {
  order_line_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type OrderForm = {
  invoice_id: string;
  status: string;
};

/** API helpers */
async function fetchOrder(orderId: string): Promise<Order> {
	const { data } = await http.get(`/orders/${orderId}`);
	return data;
}

async function fetchOrderLineItems(orderId: string): Promise<OrderLineItem[]> {
	const { data } = await http.get(`/orders/${orderId}/items`);
	return data ?? [];
}

async function updateOrder(orderId: string, payload: Partial<OrderForm>): Promise<void> {
	await http.put(`/orders/${orderId}`, payload);
}

export default function OrderDetailPage() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const { orderId } = useParams<{ orderId: string }>();
	const navigate = useNavigate();

	const [order, setOrder] = useState<Order | null>(null);
	const [lineItems, setLineItems] = useState<OrderLineItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// form state
	const [form, setForm] = useState<OrderForm>({ invoice_id: "", status: "" });
	const [saving, setSaving] = useState(false);

	// snack
	const [snack, setSnack] = useState<{ open: boolean; msg: string; type: "success" | "error" }>({
		open: false,
		msg: "",
		type: "success",
	});

	useEffect(() => {
		if (!orderId) return;
		(async () => {
			try {
				setLoading(true);
				const [orderData, itemsData] = await Promise.all([
					fetchOrder(orderId),
					fetchOrderLineItems(orderId),
				]);
				setOrder(orderData);
				setLineItems(itemsData);
				setForm({
					invoice_id: orderData.invoice_id || "",
					status: orderData.status,
				});
				setError(null);
			} catch {
				setError("Failed to load order details.");
			} finally {
				setLoading(false);
			}
		})();
	}, [orderId]);

	/** Handlers */
	const handleSave = async () => {
		if (!orderId || !order) return;

		setSaving(true);
		try {
			const payload: Partial<OrderForm> = {};
			if (form.invoice_id !== (order.invoice_id || "")) {
				payload.invoice_id = form.invoice_id;
			}
			if (form.status !== order.status) {
				payload.status = form.status;
			}

			if (Object.keys(payload).length > 0) {
				await updateOrder(orderId, payload);
				setOrder((prev) => (prev ? { ...prev, ...payload } : null));
				setSnack({ open: true, msg: "Order updated successfully!", type: "success" });
			} else {
				setSnack({ open: true, msg: "No changes to save.", type: "success" });
			}
		} catch (e: any) {
			setSnack({ open: true, msg: e?.response?.data?.message || "Failed to update order.", type: "error" });
		} finally {
			setSaving(false);
		}
	};

	/** DataGrid columns */
	const columns: GridColDef[] = [
		{ field: "order_line_id", headerName: "Line ID", flex: 0.5, minWidth: 100 },
		{ field: "product_id", headerName: "Product ID", flex: 1, minWidth: 150 },
		{ field: "quantity", headerName: "Quantity", flex: 0.5, minWidth: 100 },
		{ field: "unit_price", headerName: "Unit Price", flex: 0.7, minWidth: 120, valueFormatter: (params) => `₹${params.value}` },
		{ field: "total_price", headerName: "Total Price", flex: 0.7, minWidth: 120, valueFormatter: (params) => `₹${params.value}` },
	];

	const gridRows = useMemo(() => lineItems.map((item) => ({ id: item.order_line_id, ...item })), [lineItems]);

	if (loading) {
		return <Typography sx={{ p: 2 }}>Loading...</Typography>;
	}

	if (error) {
		return <Typography color="error" sx={{ p: 2 }}>{error}</Typography>;
	}

	if (!order) {
		return <Typography sx={{ p: 2 }}>Order not found.</Typography>;
	}

	return (
		<>
			<Paper
				sx={{
					position: "fixed",
					left: isMobile ? 0 : "var(--app-drawer-width, 240px)",
					top: "var(--app-header-height, 56px)",
					right: 0,
					bottom: 0,
					display: "flex",
					flexDirection: "column",
					borderRadius: 2,
					boxShadow: 3,
					overflow: "hidden",
					bgcolor: "background.paper",
				}}
			>
				{/* TOP BAR */}
				<AppBar position="static" color="transparent" elevation={0} sx={{ flex: "0 0 auto" }}>
					<Toolbar sx={{ minHeight: 56, gap: 1 }}>
						<IconButton onClick={() => navigate("/orders")}>
							<ArrowBackIcon />
						</IconButton>
						<Typography variant="h6" sx={{ flexGrow: 1 }}>
							Order #{order.order_id}
						</Typography>
						<Button variant="contained" onClick={handleSave} disabled={saving}>
							{saving ? "Saving..." : "Save Changes"}
						</Button>
					</Toolbar>
				</AppBar>

				{/* CONTENT */}
				<Box sx={{ flex: "1 1 auto", minHeight: 0, overflow: "auto", p: 2 }}>
					<Grid container spacing={3}>
						{/* Left Side: Order Details Form */}
						<Grid item xs={12} md={4}>
							<Typography variant="h6" gutterBottom>Details</Typography>
							<Card variant="outlined">
								<CardContent>
									<Grid container spacing={2}>
										<Grid item xs={12}>
											<TextField
												fullWidth
												label="Invoice ID"
												value={form.invoice_id}
												onChange={(e) => setForm((f) => ({ ...f, invoice_id: e.target.value }))}
											/>
										</Grid>
										<Grid item xs={12}>
											<TextField
												fullWidth
												label="Status"
												value={form.status}
												onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
											/>
										</Grid>
										<Grid item xs={12}>
											<TextField fullWidth label="Customer Name" value={order.customer_name} InputProps={{ readOnly: true }} />
										</Grid>
										<Grid item xs={12}>
											<TextField fullWidth label="Dealer" value={order.dealer_name} InputProps={{ readOnly: true }} />
										</Grid>
										<Grid item xs={12}>
											<TextField fullWidth label="Date Created" value={new Date(order.date_created).toLocaleString()} InputProps={{ readOnly: true }} />
										</Grid>
									</Grid>
								</CardContent>
							</Card>
						</Grid>

						{/* Right Side: Line Items Grid */}
						<Grid item xs={12} md={8}>
							<Typography variant="h6" gutterBottom>Line Items</Typography>
							<Box sx={{ height: 400, width: "100%" }}>
								<DataGrid
									columns={columns}
									rows={gridRows}
									loading={loading}
									disableColumnMenu
									rowSelection={false}
									hideFooter
									sx={{
										borderRadius: 1,
										"& .MuiDataGrid-columnHeaders": {
											background: theme.palette.grey[100],
										},
									}}
								/>
							</Box>
						</Grid>
					</Grid>
				</Box>
			</Paper>

			{/* Snackbar */}
			<Snackbar
				open={snack.open}
				autoHideDuration={3000}
				onClose={() => setSnack((s) => ({ ...s, open: false }))}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.type} sx={{ width: "100%" }}>
					{snack.msg}
				</Alert>
			</Snackbar>
		</>
	);
}
