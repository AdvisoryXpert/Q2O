// src/pages/Orders.tsx
import { useEffect, useMemo, useState } from "react";
import {
	AppBar,
	Avatar,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Grid,
	IconButton,
	InputAdornment,
	Paper,
	Snackbar,
	Alert,
	TextField,
	Toolbar,
	Tooltip,
	Typography,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import {
	DataGrid,
	GridColDef,
	GridRowModel,
	GridToolbarContainer,
	GridToolbarColumnsButton,
	GridToolbarFilterButton,
	GridToolbarDensitySelector,
	GridToolbarExport,
} from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { http } from "../lib/http";
import { useNavigate } from "react-router-dom";

/* -------------------- Types -------------------- */
type Order = {
  order_id: number;
  dealer_id: number;
  quote_id?: number | null;
  total_price?: number | null;
  date_created: string;
  date_modified?: string | null;
  status: string; // "Draft" | "For Dispatch" | "Dispatched" | "Invoiced" | "Closed"
  invoice_id?: string | null;
};

type OrderForm = {
  dealer_id: number | "";
  quote_id?: number | "" | null;
  total_price?: number | "" | null;
  status: string;
  invoice_id?: string | null;
};

type Dealer = { dealer_id: number; full_name: string };

/* -------------------- API helpers -------------------- */
async function fetchOrders(): Promise<Order[]> {
	try {
		// const { data } = await http.get("/orders");
		// return Array.isArray(data) ? data : [];
		const { data } = await http.get("/recentorders");
		return Array.isArray(data) ? data : [];
	} catch (err) {
		console.error("Failed to fetch orders:", err);
		return [];
	}
}

// Normalizes /dealers response whether API returns an array or { data: [...] }
async function fetchDealers(): Promise<Dealer[]> {
	try {
		const { data } = await http.get("/dealers");
		if (Array.isArray(data)) return data as Dealer[];
		if (Array.isArray((data as any)?.data)) return (data as any).data as Dealer[];
		return [];
	} catch (err) {
		console.error("Failed to fetch dealers:", err);
		return [];
	}
}

async function createOrder(payload: OrderForm): Promise<Order> {
	const { data } = await http.post("/orders", payload);
	return data;
}
async function updateOrder(id: number, patch: Partial<Order>): Promise<void> {
	await http.put(`/orders/${id}`, patch);
}
async function deleteOrder(id: number): Promise<void> {
	await http.delete(`/orders/${id}`);
}

/* -------------------- Utils -------------------- */
const toINR = (n?: number | null) =>
	typeof n === "number"
		? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
		: "-";

const STATUS_OPTIONS = ["Draft", "For Dispatch", "Dispatched", "Invoiced", "Closed"] as const;

/* -------------------- Custom Toolbar (no QuickFilter) -------------------- */
function OrdersToolbar() {
	return (
		<GridToolbarContainer>
			<GridToolbarColumnsButton />
			<GridToolbarFilterButton />
			<GridToolbarDensitySelector />
			<GridToolbarExport />
		</GridToolbarContainer>
	);
}

/* -------------------- Component -------------------- */
export default function OrdersPage() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const navigate = useNavigate();

	// data
	const [rows, setRows] = useState<Order[]>([]);
	const [dealers, setDealers] = useState<Dealer[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// ui state
	const [search, setSearch] = useState("");
	const [snack, setSnack] = useState<{ open: boolean; msg: string; type: "success" | "error" }>(
		{
			open: false,
			msg: "",
			type: "success",
		}
	);

	// form/dialog
	const [formOpen, setFormOpen] = useState(false);
	const [formMode, setFormMode] = useState<"create" | "edit">("create");
	const [editing, setEditing] = useState<Order | null>(null);
	const emptyForm: OrderForm = { dealer_id: "", quote_id: "", total_price: "", status: "For Dispatch", invoice_id: "" };
	const [form, setForm] = useState<OrderForm>(emptyForm);
	const [saving, setSaving] = useState(false);

	/* ---------- Load ---------- */
	useEffect(() => {
		(async () => {
			try {
				setLoading(true);
				const [o, d] = await Promise.all([fetchOrders(), fetchDealers()]);
				setRows(Array.isArray(o) ? o : []);
				setDealers(Array.isArray(d) ? d : []);
				setError(null);
			} catch (e) {
				console.error(e);
				setError("Failed to load orders.");
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	const getDealerName = (id?: number | null) => {
		if (id == null) return "-";
		const list = Array.isArray(dealers) ? dealers : [];
		return list.find((x) => x.dealer_id === id)?.full_name || String(id);
	};

	/* ---------- Search ---------- */
	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((r) =>
			[r.order_id, r.status, r.invoice_id, getDealerName(r.dealer_id), r.total_price]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q))
		);
	}, [rows, search, dealers]);

	const gridRows = useMemo(() => filtered.map((d) => ({ id: d.order_id, ...d })), [filtered]);

	/* ---------- Actions ---------- */
	const openCreate = () => {
		setFormMode("create");
		setEditing(null);
		setForm(emptyForm);
		setFormOpen(true);
	};
	const openEdit = (o: Order) => {
		setFormMode("edit");
		setEditing(o);
		setForm({
			dealer_id: o.dealer_id ?? "",
			quote_id: (o.quote_id ?? "") as any,
			total_price: (o.total_price ?? "") as any,
			status: o.status ?? "For Dispatch",
			invoice_id: o.invoice_id ?? "",
		});
		setFormOpen(true);
	};
	const goToDetail = (o: Order) => navigate(`/orders/${o.order_id}`);

	const confirmDelete = async (o: Order) => {
		if (o.invoice_id || o.status === "Invoiced" || o.status === "Closed") {
			if (!window.confirm("This order is invoiced/closed. Do you still want to delete it?")) return;
		} else if (!window.confirm("Delete this order?")) return;

		try {
			await deleteOrder(o.order_id);
			setRows((prev) => prev.filter((x) => x.order_id !== o.order_id));
			setSnack({ open: true, msg: "Order deleted", type: "success" });
		} catch (e: any) {
			setSnack({ open: true, msg: e?.response?.data?.message || "Delete failed", type: "error" });
		}
	};

	/* ---------- Inline row edit ---------- */
	const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
		const id = Number(newRow.order_id || newRow.id);
		const patch: Partial<Order> = {};
		(["dealer_id", "quote_id", "total_price", "status", "invoice_id"] as const).forEach((k) => {
			if (newRow[k] !== oldRow[k]) (patch as any)[k] = newRow[k];
		});
		if (Object.keys(patch).length) {
			await updateOrder(id, patch);
			setRows((prev) => prev.map((r) => (r.order_id === id ? { ...r, ...patch } : r)));
		}
		return newRow;
	};

	/* ---------- Save form ---------- */
	const saveForm = async () => {
		if (!form.dealer_id) {
			setSnack({ open: true, msg: "Dealer is required", type: "error" });
			return;
		}
		if (!form.status) {
			setSnack({ open: true, msg: "Status is required", type: "error" });
			return;
		}

		const payload: OrderForm = {
			dealer_id: Number(form.dealer_id),
			quote_id: form.quote_id ? Number(form.quote_id) : null,
			total_price: form.total_price !== "" ? Number(form.total_price) : null,
			status: form.status,
			invoice_id: form.invoice_id ? String(form.invoice_id) : null,
		};

		setSaving(true);
		try {
			if (formMode === "create") {
				await createOrder(payload);
				setRows(await fetchOrders()); // refetch to get server-populated fields
				setSnack({ open: true, msg: "Order created", type: "success" });
			} else if (formMode === "edit" && editing) {
				await updateOrder(editing.order_id, payload as any);
				setRows((prev) =>
					prev.map((r) => (r.order_id === editing.order_id ? { ...r, ...(payload as any) } : r))
				);
				setSnack({ open: true, msg: "Order updated", type: "success" });
			}
			setFormOpen(false);
		} catch (e: any) {
			setSnack({ open: true, msg: e?.response?.data?.message || "Save failed", type: "error" });
		} finally {
			setSaving(false);
		}
	};

	/* ---------- Columns (all null-safe) ---------- */
	const columns: GridColDef[] = [
		{ field: "order_id", headerName: "Order ID", minWidth: 120, flex: 0.8 },
		{
			field: "dealer_id",
			headerName: "Dealer",
			minWidth: 180,
			flex: 1.2,
			editable: true,
			// Show dealer name safely
			renderCell: (p) => (
				<Typography noWrap title={String(getDealerName(p?.row?.dealer_id))}>
					{getDealerName(p?.row?.dealer_id)}
				</Typography>
			),
		},
		{
			field: "total_price",
			headerName: "Total",
			minWidth: 140,
			flex: 0.9,
			editable: true,
			// Null-safe currency display
			renderCell: (p) => <Typography noWrap>{toINR(typeof p?.value === "number" ? (p.value as number) : null)}</Typography>,
		},
		{
			field: "date_created",
			headerName: "Created",
			minWidth: 160,
			flex: 1,
			// Null-safe date display
			renderCell: (p) => (
				<Typography noWrap>
					{p?.value ? new Date(p.value as string).toLocaleString() : "-"}
				</Typography>
			),
		},
		{
			field: "status",
			headerName: "Status",
			minWidth: 150,
			flex: 1,
			editable: true,
			renderCell: (p) => {
				const v = (p?.value as string) ?? "-";
				const color =
					v === "For Dispatch"
						? "warning"
						: v === "Dispatched"
							? "info"
							: v === "Invoiced"
								? "secondary"
								: v === "Closed"
									? "success"
									: "default";
				return (
					<Chip
						size="small"
						label={v}
						color={color as any}
						sx={{ height: 24, "& .MuiChip-label": { px: 1, fontWeight: 600 } }}
					/>
				);
			},
		},
		{
			field: "invoice_id",
			headerName: "Invoice ID",
			minWidth: 160,
			flex: 1,
			editable: true,
			renderCell: (p) => <Typography noWrap>{p?.value ?? "-"}</Typography>,
		},
		{
			field: "actions",
			headerName: "Actions",
			sortable: false,
			filterable: false,
			disableColumnMenu: true,
			minWidth: 160,
			flex: 0.9,
			renderCell: (p) => {
				const o = p.row as Order;
				return (
					<Box sx={{ display: "flex", gap: 0.5 }}>
						<Tooltip title="Open Order Detail">
							<IconButton size="small" color="primary" onClick={() => goToDetail(o)}>
								<VisibilityIcon fontSize="small" />
							</IconButton>
						</Tooltip>
						<Tooltip title="Edit">
							<IconButton size="small" onClick={() => openEdit(o)}>
								<EditIcon fontSize="small" />
							</IconButton>
						</Tooltip>
						<Tooltip title="Delete">
							<IconButton size="small" color="error" onClick={() => confirmDelete(o)}>
								<DeleteIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					</Box>
				);
			},
		},
	];

	/* ---------- Render ---------- */
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
					<Toolbar sx={{ minHeight: 56, gap: 1, justifyContent: "space-between" }}>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
							<TextField
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								size="medium"
								placeholder="Search orders..."
								InputProps={{
									startAdornment: (
										<InputAdornment position="start">
											<SearchIcon fontSize="small" />
										</InputAdornment>
									),
								}}
								sx={{ width: { xs: 220, sm: 320, md: 420 } }}
							/>
							<Button
								startIcon={<AddIcon />}
								variant="contained"
								onClick={openCreate}
								sx={{ textTransform: "none", fontWeight: 700 }}
							>
								New Order
							</Button>
						</Box>

						{/* Filter (right) */}
						<Tooltip title="Open column filters">
							<IconButton
								size="small"
								onClick={() => {
									const el = document.querySelector('[data-testid="Open filter panel"]') as HTMLElement | null;
									el?.click();
								}}
							>
								<FilterListIcon />
							</IconButton>
						</Tooltip>
					</Toolbar>
				</AppBar>

				{/* CONTENT */}
				<Box sx={{ flex: "1 1 auto", minHeight: 0, overflow: "auto", p: 1.25 }}>
					{error && (
						<Typography color="error" sx={{ mb: 1 }}>
							{error}
						</Typography>
					)}

					{!isMobile ? (
						<DataGrid
							columns={columns}
							rows={gridRows}
							loading={loading}
							editMode="row"
							processRowUpdate={processRowUpdate}
							onProcessRowUpdateError={(err) => console.error(err)}
							disableColumnMenu
							rowSelection={false}
							hideFooter
							slots={{ toolbar: OrdersToolbar }}  // custom toolbar, no QuickFilter
							columnHeaderHeight={52}
							rowHeight={56}
							sx={{
								borderRadius: 2,
								backgroundColor: "background.paper",
								fontSize: ".95rem",
								"& .MuiDataGrid-columnHeaders": {
									fontWeight: 800,
									background:
										"linear-gradient(90deg, rgba(7,71,166,0.07) 0%, rgba(7,71,166,0.03) 100%)",
								},
								"& .MuiDataGrid-columnHeaderTitle": { fontWeight: 800 },
								"& .MuiDataGrid-cell": {
									whiteSpace: "nowrap",
									overflow: "hidden",
									textOverflow: "ellipsis",
								},
								"& .MuiDataGrid-row:nth-of-type(even)": {
									backgroundColor: "rgba(0,0,0,0.02)",
								},
								"& .MuiDataGrid-row:hover": {
									backgroundColor: "rgba(7,71,166,0.06)",
								},
							}}
							autoHeight={gridRows.length <= 14}
						/>
					) : (
					// Mobile cards
						<Box
							sx={{
								overflowY: "auto",
								height: "100%",
								pr: 0.5,
								"&::-webkit-scrollbar": { width: 6 },
								"&::-webkit-scrollbar-thumb": { background: theme.palette.grey[400], borderRadius: 3 },
							}}
						>
							<Grid container spacing={1}>
								{filtered.map((o) => (
									<Grid item xs={12} key={o.order_id}>
										<Card variant="outlined" sx={{ borderRadius: 2 }}>
											<CardContent sx={{ py: 1.25 }}>
												<Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
													<Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: "primary.main" }}>
														{String(o.order_id)[0] ?? "?"}
													</Avatar>
													<Box sx={{ minWidth: 0, flex: 1 }}>
														<Typography fontWeight={700} noWrap title={`Order #${o.order_id}`}>
															Order #{o.order_id}
														</Typography>
														<Typography variant="caption" color="text.secondary" noWrap>
															{getDealerName(o.dealer_id)}
														</Typography>
													</Box>
													<Chip
														size="small"
														label={o.status}
														color={
															o.status === "For Dispatch"
																? "warning"
																: o.status === "Dispatched"
																	? "info"
																	: o.status === "Invoiced"
																		? "secondary"
																		: o.status === "Closed"
																			? "success"
																			: "default"
														}
														sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: 11, fontWeight: 700 } }}
													/>
												</Box>

												<Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
													<Typography variant="body2">Total</Typography>
													<Typography variant="body2" fontWeight={700}>{toINR(o.total_price)}</Typography>
												</Box>
												<Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
													<Typography variant="body2">Created</Typography>
													<Typography variant="body2">
														{o.date_created ? new Date(o.date_created).toLocaleString() : "-"}
													</Typography>
												</Box>
												{o.invoice_id && (
													<Box sx={{ display: "flex", justifyContent: "space-between" }}>
														<Typography variant="body2">Invoice</Typography>
														<Typography variant="body2">{o.invoice_id}</Typography>
													</Box>
												)}

												<Box sx={{ display: "flex", gap: 0.5, mt: 1 }}>
													<Tooltip title="Open Order Detail">
														<IconButton size="small" color="primary" onClick={() => goToDetail(o)}>
															<VisibilityIcon fontSize="small" />
														</IconButton>
													</Tooltip>
													<Tooltip title="Edit">
														<IconButton size="small" onClick={() => openEdit(o)}>
															<EditIcon fontSize="small" />
														</IconButton>
													</Tooltip>
													<Tooltip title="Delete">
														<IconButton size="small" color="error" onClick={() => confirmDelete(o)}>
															<DeleteIcon fontSize="small" />
														</IconButton>
													</Tooltip>
												</Box>
											</CardContent>
										</Card>
									</Grid>
								))}
							</Grid>
						</Box>
					)}
				</Box>
			</Paper>

			{/* Create/Edit Dialog */}
			<Dialog open={formOpen} onClose={() => setFormOpen(false)} fullScreen={isMobile} maxWidth="md" fullWidth>
				<DialogTitle>{formMode === "create" ? "New Order" : "Edit Order"}</DialogTitle>
				<DialogContent dividers>
					<Grid container spacing={2} sx={{ pt: 1 }}>
						<Grid item xs={12} sm={6}>
							<TextField
								required
								select
								SelectProps={{ native: true }}
								fullWidth
								label="Dealer"
								value={form.dealer_id}
								onChange={(e) => setForm((f) => ({ ...f, dealer_id: Number(e.target.value) || "" }))}
							>
								<option value=""></option>
								{Array.isArray(dealers) && dealers.map((d) => (
									<option key={d.dealer_id} value={d.dealer_id}>
										{d.full_name}
									</option>
								))}
							</TextField>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								type="number"
								fullWidth
								label="Quote ID"
								value={form.quote_id ?? ""}
								onChange={(e) =>
									setForm((f) => ({ ...f, quote_id: e.target.value === "" ? "" : Number(e.target.value) }))
								}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								type="number"
								fullWidth
								label="Total Price (INR)"
								value={form.total_price ?? ""}
								onChange={(e) =>
									setForm((f) => ({ ...f, total_price: e.target.value === "" ? "" : Number(e.target.value) }))
								}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								select
								SelectProps={{ native: true }}
								fullWidth
								label="Status"
								value={form.status}
								onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
							>
								{STATUS_OPTIONS.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</TextField>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Invoice ID"
								value={form.invoice_id ?? ""}
								onChange={(e) => setForm((f) => ({ ...f, invoice_id: e.target.value || "" }))}
							/>
						</Grid>

						{formMode === "edit" && editing && (
							<>
								<Grid item xs={12} sm={6}>
									<TextField fullWidth label="Order ID" value={editing.order_id} InputProps={{ readOnly: true }} />
								</Grid>
								<Grid item xs={12} sm={6}>
									<TextField
										fullWidth
										label="Created"
										value={editing.date_created ? new Date(editing.date_created).toLocaleString() : "-"}
										InputProps={{ readOnly: true }}
									/>
								</Grid>
								{editing.date_modified && (
									<Grid item xs={12} sm={6}>
										<TextField
											fullWidth
											label="Modified"
											value={new Date(editing.date_modified).toLocaleString()}
											InputProps={{ readOnly: true }}
										/>
									</Grid>
								)}
							</>
						)}
					</Grid>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setFormOpen(false)} variant="outlined" disabled={saving}>
						Cancel
					</Button>
					<Button onClick={saveForm} variant="contained" disabled={saving}>
						{saving ? "Saving..." : "Save"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Snackbar */}
			<Snackbar
				open={snack.open}
				autoHideDuration={2200}
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
