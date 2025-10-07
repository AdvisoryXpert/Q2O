import React, { useEffect, useState } from "react";
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
	Divider,
	Popover,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useParams, useNavigate } from "react-router-dom";
import { http } from "../lib/http";
import { getUserId } from "../services/AuthService";
import { BarcodeScanner, CameraOCRScanner } from "../utils/scanner_ocr";

/** Types */
type Order = {
  order_id: number;
  quote_id: number;
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
  product_attribute_id?: number;
  product_name?: string;
  component_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type DispatchItem = OrderLineItem & {
  dealer_id: number;
  dealer_name: string;
  serial_number: string;
  customer_name: string;
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

	/** Page state */
	const [order, setOrder] = useState<Order | null>(null);
	const [dispatchItems, setDispatchItems] = useState<DispatchItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	/** Form state */
	const [form, setForm] = useState<OrderForm>({ invoice_id: "", status: "" });
	const [saving, setSaving] = useState(false);
	const [dispatching, setDispatching] = useState(false);

	/** Snack */
	const [snack, setSnack] = useState<{ open: boolean; msg: string; type: "success" | "error" }>({
		open: false,
		msg: "",
		type: "success",
	});

	/** Popover state (anchor next to each line) */
	const [scanPopover, setScanPopover] = useState<{ index: number; anchorEl: HTMLElement } | null>(null);
	const [ocrPopover, setOcrPopover] = useState<{ index: number; anchorEl: HTMLElement } | null>(null);

	/** Load order + items */
	useEffect(() => {
		if (!orderId) return;
		(async () => {
			try {
				setLoading(true);
				const [orderData, items] = await Promise.all([fetchOrder(orderId), fetchOrderLineItems(orderId)]);
				setOrder(orderData);
				setForm({ invoice_id: orderData.invoice_id || "", status: orderData.status });

				const mapped: DispatchItem[] = (items || []).map((it) => ({
					...it,
					dealer_id: orderData.dealer_id,
					dealer_name: orderData.dealer_name,
					customer_name: orderData.dealer_name,
					serial_number: "",
				}));
				setDispatchItems(mapped);
				setError(null);
			} catch {
				setError("Failed to load order details.");
			} finally {
				setLoading(false);
			}
		})();
	}, [orderId]);

	/** Handlers */
	const onSerialChange = (index: number, value: string) => {
		setDispatchItems((prev) => {
			const next = [...prev];
			next[index] = { ...next[index], serial_number: value };
			return next;
		});
	};

	const handleSave = async () => {
		if (!orderId || !order) return;
		setSaving(true);
		try {
			const payload: Partial<OrderForm> = {};
			if (form.invoice_id !== (order.invoice_id || "")) payload.invoice_id = form.invoice_id;
			if (form.status !== order.status) payload.status = form.status;

			if (Object.keys(payload).length > 0) {
				await updateOrder(orderId, payload);
				setOrder((prev) => (prev ? { ...prev, ...payload } : null));
				setSnack({ open: true, msg: "Order updated successfully!", type: "success" });
			} else {
				setSnack({ open: true, msg: "No changes to save.", type: "success" });
			}
		} catch (e: any) {
			setSnack({
				open: true,
				msg: e?.response?.data?.message || "Failed to update order.",
				type: "error",
			});
		} finally {
			setSaving(false);
		}
	};

	const handleSaveAndDispatch = async () => {
		if (!orderId) return;
		setDispatching(true);
		try {
			const userId = (await getUserId()) || "1";
			const payload = {
				order_id: orderId,
				dispatch_items: dispatchItems.map((it) => ({
					order_line_id: it.order_line_id,
					serial_number: it.serial_number,
					product_id: it.product_id,
					product_attribute_id: it.product_attribute_id,
					dealer_id: it.dealer_id,
					customer_name: it.dealer_name,
					user_id: userId,
				})),
			};
			// Adjust path if needed (e.g., /api/warranty/)
			await http.post(`/warranty`, payload);

			// Also update the quote status to Finalized
			if (order.quote_id) {
				try {
					await http.put(`/quotation/${order.quote_id}/status`, { status: "Finalized" });
				} catch (e) {
					console.error("Failed to finalize quote", e);
					// Non-fatal, so we don't show an error to the user
				}
			}

			setSnack({ open: true, msg: "✅ Order dispatched and warranties created!", type: "success" });
		} catch (e: any) {
			const msg = e?.response?.data?.message || e?.message || "Dispatch failed";
			setSnack({ open: true, msg: `❌ ${msg}`, type: "error" });
		} finally {
			setDispatching(false);
		}
	};

	/** UI: Loading / error guards */
	if (loading) return <Typography sx={{ p: 2 }}>Loading...</Typography>;
	if (error) return <Typography color="error" sx={{ p: 2 }}>{error}</Typography>;
	if (!order) return <Typography sx={{ p: 2 }}>Order not found.</Typography>;

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

						<Button variant="outlined" onClick={handleSave} disabled={saving} sx={{ mr: 1 }}>
							{saving ? "Saving..." : "Save Changes"}
						</Button>
						<Button
							variant="contained"
							onClick={handleSaveAndDispatch}
							disabled={dispatching || dispatchItems.length === 0}
						>
							{dispatching ? "Dispatching..." : "Save & Dispatch"}
						</Button>
					</Toolbar>
				</AppBar>

				{/* CONTENT */}
				<Box sx={{ flex: "1 1 auto", minHeight: 0, overflow: "auto", p: 2 }}>
					<Grid container spacing={3}>
						{/* Left: Order Details */}
						<Grid item xs={12} md={4}>
							<Typography variant="h6" gutterBottom>
								Details
							</Typography>
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
											<TextField
												fullWidth
												label="Date Created"
												value={new Date(order.date_created).toLocaleString()}
												InputProps={{ readOnly: true }}
											/>
										</Grid>
									</Grid>
								</CardContent>
							</Card>
						</Grid>

						{/* Right: Dispatch Items */}
						<Grid item xs={12} md={8}>
							<Typography variant="h6" gutterBottom>
								Dispatch Items
							</Typography>

							{dispatchItems.length === 0 ? (
								<Typography color="text.secondary">No items to dispatch.</Typography>
							) : (
								dispatchItems.map((item, index) => (
									<Card key={item.order_line_id} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
										<CardContent>
											<Grid container spacing={1}>
												<Grid item xs={12} sm={6}>
													<Typography variant="body2"><b>Product ID:</b> {item.product_id}</Typography>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Typography variant="body2"><b>Line ID:</b> {item.order_line_id}</Typography>
												</Grid>
												{item.product_name && (
													<Grid item xs={12}>
														<Typography variant="body2"><b>Product:</b> {item.product_name}</Typography>
													</Grid>
												)}
												{item.component_name && (
													<Grid item xs={12}>
														<Typography variant="body2"><b>Component:</b> {item.component_name}</Typography>
													</Grid>
												)}
												<Grid item xs={6} sm={3}>
													<Typography variant="body2"><b>Qty:</b> {item.quantity}</Typography>
												</Grid>
												<Grid item xs={6} sm={4}>
													<Typography variant="body2"><b>Unit Price:</b> ₹{item.unit_price}</Typography>
												</Grid>
												<Grid item xs={12} sm={5}>
													<Typography variant="body2"><b>Total:</b> ₹{item.total_price}</Typography>
												</Grid>
											</Grid>

											<Divider sx={{ my: 1.5 }} />

											<TextField
												fullWidth
												label="Serial Number"
												variant="outlined"
												value={item.serial_number}
												onChange={(e) => onSerialChange(index, e.target.value)}
											/>

											<Grid container spacing={1} sx={{ mt: 1 }}>
												<Grid item xs={12} sm={6}>
													<Button
														variant="outlined"
														fullWidth
														onClick={(e) => setScanPopover({ index, anchorEl: e.currentTarget as HTMLElement })}
													>
														Scan Barcode / QR
													</Button>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Button
														variant="outlined"
														fullWidth
														onClick={(e) => setOcrPopover({ index, anchorEl: e.currentTarget as HTMLElement })}
													>
														Scan From Camera
													</Button>
												</Grid>
											</Grid>
										</CardContent>
									</Card>
								))
							)}
						</Grid>
					</Grid>
				</Box>
			</Paper>

			{/* --- Popover: Barcode / QR --- */}
			<Popover
				open={Boolean(scanPopover)}
				anchorEl={scanPopover?.anchorEl || null}
				onClose={() => setScanPopover(null)}
				anchorOrigin={{ vertical: "center", horizontal: "right" }}
				transformOrigin={{ vertical: "center", horizontal: "left" }}
				PaperProps={{
					sx: {
						p: 1,
						width: 360,
						maxWidth: "85vw",
						height: 360,
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
					},
				}}
			>
				{scanPopover !== null && (
					<Box sx={{ flex: 1, minHeight: 0 }}>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							Scan Barcode / QR (Line #{scanPopover.index + 1})
						</Typography>
						<Box sx={{ borderRadius: 1, overflow: "hidden", height: "100%" }}>
							<BarcodeScanner
								onDetected={(serial) => {
									setDispatchItems((prev) => {
										const next = [...prev];
										next[scanPopover.index] = { ...next[scanPopover.index], serial_number: serial };
										return next;
									});
									setScanPopover(null);
								}}
								onClose={() => setScanPopover(null)}
							/>
						</Box>
					</Box>
				)}
			</Popover>

			{/* --- Popover: Camera OCR --- */}
			<Popover
				open={Boolean(ocrPopover)}
				anchorEl={ocrPopover?.anchorEl || null}
				onClose={() => setOcrPopover(null)}
				anchorOrigin={{ vertical: "center", horizontal: "right" }}
				transformOrigin={{ vertical: "center", horizontal: "left" }}
				PaperProps={{
					sx: {
						p: 1,
						width: 420,
						maxWidth: "90vw",
						height: 420,
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
					},
				}}
			>
				{ocrPopover !== null && (
					<Box sx={{ flex: 1, minHeight: 0 }}>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							Scan From Camera (Line #{ocrPopover.index + 1})
						</Typography>
						<Box sx={{ borderRadius: 1, overflow: "hidden", height: "100%" }}>
							<CameraOCRScanner
								index={ocrPopover.index}
								onDetected={(i, serial) => {
									setDispatchItems((prev) => {
										const next = [...prev];
										next[i] = { ...next[i], serial_number: serial };
										return next;
									});
									setOcrPopover(null);
								}}
								onClose={() => setOcrPopover(null)}
							/>
						</Box>
					</Box>
				)}
			</Popover>

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
