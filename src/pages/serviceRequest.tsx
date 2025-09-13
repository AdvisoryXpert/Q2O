import React, { useEffect, useMemo, useState } from "react";
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
	MenuItem,
	Paper,
	TextField,
	Toolbar,
	Tooltip,
	Typography,
	useMediaQuery,
	useTheme,
	Snackbar,
	Alert,
} from "@mui/material";
import {
	DataGrid,
	GridColDef,
	GridToolbar,
} from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import EditIcon from "@mui/icons-material/Edit";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DescriptionIcon from "@mui/icons-material/Description";

import { useParams } from "react-router-dom";
import TopAppBar from "../navBars/topAppBar";
import { useNavAccess } from "../navBars/navBars";
import { getUserId } from "../services/AuthService";

// ✅ same helper that Contact.tsx uses
import { http } from "../lib/http";

/** Types */
type ServiceRequest = {
  id: string;
  order_id: string;
  dealer_id: string;
  status: "Open" | "In Progress" | "Closed" | string;
  user_id: string | number;
  invoice_id?: string;
  file_path?: string;
  filename?: string;
  notes?: string;
};

type Dealer = {
  dealer_id: string;
  full_name: string;
  phone?: string;
};

type OrderOption = {
  order_id: string;
  invoice_id: string;
  dealer_id: string;
};

const generateUniqueServiceId = () => `SR-${Date.now()}`;

/* --------------------- API --------------------- */
async function fetchServiceRequests(): Promise<ServiceRequest[]> {
	const { data } = await http.get("/service-requests");
	return data ?? [];
}
async function fetchDealers(): Promise<Dealer[]> {
	const { data } = await http.get("/dealers");
	return data ?? [];
}
async function fetchOrdersBasic(): Promise<OrderOption[]> {
	const { data } = await http.get("/orders-basic");
	return data ?? [];
}
async function createSR(payload: Omit<ServiceRequest, "user_id"> & { user_id: number }) {
	await http.post("/service-requests", payload);
}
async function updateSR(patch: Partial<ServiceRequest> & { id: string }) {
	await http.put(`/service-requests/${patch.id}`, patch);
}
async function uploadAttachment(srId: string, file: File) {
	const formData = new FormData();
	formData.append("file", file);
	await http.post(`/service-requests/${srId}/attachment`, formData, {
		headers: { "Content-Type": "multipart/form-data" },
	});
}

/* --------------------- Page --------------------- */
export default function ServiceRequestTable() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const navItems = useNavAccess();
	const { id: routeId } = useParams();

	// Data
	const [rows, setRows] = useState<ServiceRequest[]>([]);
	const [dealersMap, setDealersMap] = useState<Record<string, Dealer>>({});
	const [ordersMap, setOrdersMap] = useState<Record<string, OrderOption>>({});

	// UI
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");

	// Create Modal
	const [createOpen, setCreateOpen] = useState(false);
	const [createInvoice, setCreateInvoice] = useState("");
	const [createResolvedOrder, setCreateResolvedOrder] = useState<OrderOption | null>(null);
	const [createSubmitting, setCreateSubmitting] = useState(false);

	// Edit Modal
	const [editOpen, setEditOpen] = useState(false);
	const [editRow, setEditRow] = useState<ServiceRequest | null>(null);
	const [editStatus, setEditStatus] = useState<ServiceRequest["status"]>("Open");
	const [editNotes, setEditNotes] = useState<string>("");

	// Snackbar
	const [snack, setSnack] = useState<{ open: boolean; msg: string; type: "success" | "error" }>({
		open: false,
		msg: "",
		type: "success",
	});

	/* Load everything (like Contact) */
	const loadAll = async () => {
		try {
			setLoading(true);
			const [sr, dealers, orders] = await Promise.all([
				fetchServiceRequests(),
				fetchDealers(),
				fetchOrdersBasic(),
			]);
			const srFiltered = routeId ? sr.filter((r) => String(r.id) === String(routeId)) : sr;
			setRows(srFiltered);

			const dMap: Record<string, Dealer> = {};
			dealers.forEach((d) => (dMap[d.dealer_id] = d));
			setDealersMap(dMap);

			const oMap: Record<string, OrderOption> = {};
			orders.forEach((o) => (oMap[o.order_id] = o));
			setOrdersMap(oMap);

			setError(null);
		} catch (e: any) {
			setError(e?.message || "Failed to load data.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadAll();
	}, [routeId]);

	/* Filter */
	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((r) =>
			[
				r.id,
				r.order_id,
				r.dealer_id,
				dealersMap[r.dealer_id]?.full_name,
				r.status,
				r.invoice_id,
				r.notes,
			]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q))
		);
	}, [rows, search, dealersMap]);

	const gridRows = useMemo(() => filtered.map((r) => ({ id: r.id, ...r })), [filtered]);

	/* --------------------- Create Modal Logic --------------------- */
	const openCreate = () => {
		setCreateInvoice("");
		setCreateResolvedOrder(null);
		setCreateOpen(true);
	};
	const resolveInvoice = () => {
		const match = Object.values(ordersMap).find((o) => o.invoice_id === createInvoice.trim());
		setCreateResolvedOrder(match || null);
	};
	const submitCreate = async () => {
		try {
			if (!createResolvedOrder) {
				setSnack({ open: true, msg: "Enter a valid Invoice ID first.", type: "error" });
				return;
			}
			setCreateSubmitting(true);
			await createSR({
				id: generateUniqueServiceId(),
				order_id: createResolvedOrder.order_id,
				dealer_id: createResolvedOrder.dealer_id,
				invoice_id: createResolvedOrder.invoice_id,
				status: "Open",
				user_id: Number(await getUserId()),
			});
			setCreateOpen(false);
			await loadAll();
			setSnack({ open: true, msg: "Service Request created", type: "success" });
		} catch (e: any) {
			setSnack({ open: true, msg: e?.message || "Create failed", type: "error" });
		} finally {
			setCreateSubmitting(false);
		}
	};

	/* --------------------- Edit Modal Logic --------------------- */
	const openEdit = (row: ServiceRequest) => {
		setEditRow(row);
		setEditStatus((row.status as any) || "Open");
		setEditNotes(row.notes || "");
		setEditOpen(true);
	};
	const submitEdit = async () => {
		if (!editRow) return;
		const patch: Partial<ServiceRequest> & { id: string } = { id: editRow.id };
		let changed = false;
		if (editStatus !== editRow.status) {
			patch.status = editStatus;
			changed = true;
		}
		if ((editNotes || "") !== (editRow.notes || "")) {
			patch.notes = editNotes;
			changed = true;
		}
		if (!changed) {
			setEditOpen(false);
			return;
		}
		try {
			await updateSR(patch);
			setRows((prev) => prev.map((r) => (r.id === editRow.id ? { ...r, ...patch } : r)));
			setEditOpen(false);
			setSnack({ open: true, msg: "Updated", type: "success" });
		} catch (e: any) {
			setSnack({ open: true, msg: e?.message || "Update failed", type: "error" });
		}
	};
	const uploadInEdit = async (file?: File | null) => {
		if (!file || !editRow) return;
		try {
			await uploadAttachment(editRow.id, file);
			await loadAll();
			setSnack({ open: true, msg: "File uploaded", type: "success" });
		} catch (err: any) {
			setSnack({ open: true, msg: err?.message || "Upload failed", type: "error" });
		}
	};

	/* --------------------- Columns --------------------- */
	const columns: GridColDef[] = [
		{
			field: "id",
			headerName: "SR ID",
			minWidth: 180,
			flex: 1.1,
			renderCell: (p) => (
				<Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
					<AssignmentIcon sx={{ fontSize: 16, mr: 0.75, color: "text.secondary" }} />
					<Typography noWrap fontWeight={700} title={String(p.value ?? "")}>
						{p.value}
					</Typography>
				</Box>
			),
		},
		{
			field: "invoice_id",
			headerName: "Invoice",
			minWidth: 140,
			flex: 0.9,
			renderCell: (p) => (
				<Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
					<DescriptionIcon sx={{ fontSize: 16, mr: 0.75, color: "text.secondary" }} />
					<Typography noWrap title={String(p.value ?? "")}>{p.value || "-"}</Typography>
				</Box>
			),
		},
		{ field: "order_id", headerName: "Order", minWidth: 140, flex: 0.9 },
		{
			field: "dealer_id",
			headerName: "Dealer",
			minWidth: 220,
			flex: 1.4,
			renderCell: (p) => {
				const d = dealersMap[p.value as string];
				return (
					<Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
						<Avatar sx={{ width: 28, height: 28, mr: 1, bgcolor: "primary.main", fontSize: 12 }}>
							{(d?.full_name || String(p.value || "?"))[0]}
						</Avatar>
						<Box sx={{ minWidth: 0 }}>
							<Typography fontWeight={700} noWrap title={d?.full_name || String(p.value || "")}>
								{d?.full_name || p.value}
							</Typography>
							{d?.phone && (
								<Typography variant="caption" color="text.secondary" noWrap title={d.phone}>
									{d.phone}
								</Typography>
							)}
						</Box>
					</Box>
				);
			},
		},
		{
			field: "status",
			headerName: "Status",
			minWidth: 150,
			flex: 0.9,
			renderCell: (p) => (
				<Chip
					label={p.value || "-"}
					size="small"
					color={
						p.value === "Closed"
							? "success"
							: p.value === "In Progress"
								? "warning"
								: "default"
					}
					sx={{ height: 24, "& .MuiChip-label": { px: 1, fontSize: 12, fontWeight: 700 } }}
				/>
			),
		},
		{ field: "notes", headerName: "Notes", minWidth: 260, flex: 1.6 },
		{
			field: "file_path",
			headerName: "Attachment",
			minWidth: 220,
			flex: 1.1,
			sortable: false,
			filterable: false,
			disableColumnMenu: true,
			renderCell: (p) => {
				const row = p.row as ServiceRequest;
				const hasFile = !!row.filename;
				return (
					<Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
						<Button
							size="small"
							startIcon={<CloudUploadIcon />}
							variant="outlined"
							onClick={(e) => {
								e.stopPropagation();
								// open edit modal for consistent UX (upload inside it)
								openEdit(row);
							}}
							sx={{ textTransform: "none" }}
						>
							Upload
						</Button>
						{hasFile && (
							<a
								href={`/uploads/lr-receipts/${row.file_path}`}
								target="_blank"
								rel="noopener noreferrer"
								style={{ display: "inline-block", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
								title={row.filename}
							>
								{row.filename}
							</a>
						)}
					</Box>
				);
			},
		},
		{
			field: "actions",
			headerName: "Actions",
			sortable: false,
			filterable: false,
			disableColumnMenu: true,
			minWidth: 110,
			flex: 0.7,
			renderCell: (p) => {
				const d = p.row as ServiceRequest;
				return (
					<Tooltip title="Edit">
						<IconButton size="small" onClick={() => openEdit(d)}>
							<EditIcon fontSize="small" />
						</IconButton>
					</Tooltip>
				);
			},
		},
	];

	return (
		<>
			{/* Global top nav (same as Contact) */}
			<TopAppBar navItems={navItems} />

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
				{/* Toolbar like Contact: search + New SR + filters button */}
				<AppBar position="static" color="transparent" elevation={0} sx={{ flex: "0 0 auto" }}>
					<Toolbar sx={{ minHeight: 56, gap: 1, justifyContent: "space-between" }}>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
							<TextField
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								size="medium"
								placeholder="Search SRs..."
								InputProps={{
									startAdornment: (
										<InputAdornment position="start">
											<SearchIcon fontSize="small" />
										</InputAdornment>
									),
								}}
								sx={{ width: { xs: 220, sm: 320, md: 420 } }}
							/>
						</Box>

						<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<Button variant="contained" onClick={openCreate} sx={{ textTransform: "none", fontWeight: 700 }}>
								New Service Request
							</Button>
							<Tooltip title="Open column filters">
								<IconButton
									size="small"
									onClick={() => {
										(document.querySelector('[data-testid="Open filter panel"]') as HTMLElement | null)?.click();
									}}
								>
									<FilterListIcon />
								</IconButton>
							</Tooltip>
						</Box>
					</Toolbar>
				</AppBar>

				{/* Content */}
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
							disableColumnMenu
							rowSelection={false}
							hideFooter
							slots={{ toolbar: GridToolbar }}
							slotProps={{ toolbar: { showQuickFilter: false } }}
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
					// Mobile cards (aligned with Contact)
						<Box
							sx={{
								overflowY: "auto",
								height: "100%",
								pr: 0.5,
								"&::-webkit-scrollbar": { width: 6 },
								"&::-webkit-scrollbar-thumb": {
									background: theme.palette.grey[400],
									borderRadius: 3,
								},
							}}
						>
							<Grid container spacing={1}>
								{filtered.map((r) => (
									<Grid item xs={12} key={r.id}>
										<Card variant="outlined" sx={{ borderRadius: 2 }}>
											<CardContent sx={{ py: 1.25 }}>
												<Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
													<Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: "primary.main" }}>
														{r.id?.[0] ?? "S"}
													</Avatar>
													<Box sx={{ minWidth: 0, flex: 1 }}>
														<Typography fontWeight={700} noWrap title={r.id}>
															{r.id}
														</Typography>
														<Typography variant="caption" color="text.secondary" noWrap>
															{dealersMap[r.dealer_id]?.full_name || r.dealer_id}
														</Typography>
													</Box>
													<Chip
														label={r.status}
														size="small"
														color={
															r.status === "Closed"
																? "success"
																: r.status === "In Progress"
																	? "warning"
																	: "default"
														}
														sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: 11 } }}
													/>
													<Tooltip title="Edit">
														<IconButton size="small" onClick={() => openEdit(r)}>
															<EditIcon fontSize="small" />
														</IconButton>
													</Tooltip>
												</Box>
												<Typography variant="body2" color="text.secondary" noWrap>
													Invoice: {r.invoice_id || "-"} • Order: {r.order_id}
												</Typography>
												{r.filename && (
													<Typography variant="body2" color="text.secondary" noWrap title={r.filename}>
														File: {r.filename}
													</Typography>
												)}
												{r.notes && (
													<Typography variant="body2" color="text.secondary" noWrap title={r.notes}>
														Notes: {r.notes}
													</Typography>
												)}
											</CardContent>
										</Card>
									</Grid>
								))}
							</Grid>
						</Box>
					)}
				</Box>
			</Paper>

			{/* --------------------- Create Modal --------------------- */}
			<Dialog
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				fullWidth
				maxWidth="sm"
				PaperProps={{ sx: { borderRadius: 2 } }}
			>
				<DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<Typography variant="h6">New Service Request</Typography>
					<IconButton onClick={() => setCreateOpen(false)} size="small">
						<CloseIcon />
					</IconButton>
				</DialogTitle>
				<DialogContent dividers>
					<Grid container spacing={2}>
						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Invoice ID"
								placeholder="Enter invoice to resolve order"
								value={createInvoice}
								onChange={(e) => setCreateInvoice(e.target.value)}
								onBlur={resolveInvoice}
								helperText={createResolvedOrder ? `Resolved: Order ${createResolvedOrder.order_id}` : "Leave field to auto-resolve"}
							/>
						</Grid>

						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Order (resolved)"
								value={createResolvedOrder?.order_id || ""}
								InputProps={{ readOnly: true }}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Dealer (resolved)"
								value={
									createResolvedOrder
										? (dealersMap[createResolvedOrder.dealer_id]?.full_name || createResolvedOrder.dealer_id)
										: ""
								}
								InputProps={{ readOnly: true }}
							/>
						</Grid>

						<Grid item xs={12} sm={6}>
							<TextField select fullWidth label="Status" value={"Open"} InputProps={{ readOnly: true }}>
								<MenuItem value="Open">Open</MenuItem>
							</TextField>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField fullWidth label="Created By" value="Current User" InputProps={{ readOnly: true }} />
						</Grid>
					</Grid>
				</DialogContent>
				<DialogActions>
					<Button variant="outlined" onClick={() => setCreateOpen(false)}>Cancel</Button>
					<Button variant="contained" onClick={submitCreate} disabled={!createResolvedOrder || createSubmitting}>
						{createSubmitting ? "Creating..." : "Create"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* --------------------- Edit Modal --------------------- */}
			<Dialog
				open={editOpen}
				onClose={() => setEditOpen(false)}
				fullWidth
				maxWidth="sm"
				PaperProps={{ sx: { borderRadius: 2 } }}
			>
				<DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<Typography variant="h6">Edit Service Request</Typography>
					<IconButton onClick={() => setEditOpen(false)} size="small">
						<CloseIcon />
					</IconButton>
				</DialogTitle>
				<DialogContent dividers>
					{editRow ? (
						<Grid container spacing={2}>
							<Grid item xs={12} sm={6}>
								<TextField fullWidth label="SR ID" value={editRow.id} InputProps={{ readOnly: true }} />
							</Grid>
							<Grid item xs={12} sm={6}>
								<TextField
									select
									fullWidth
									label="Status"
									value={editStatus}
									onChange={(e) => setEditStatus(e.target.value as ServiceRequest["status"])}
								>
									<MenuItem value="Open">Open</MenuItem>
									<MenuItem value="In Progress">In Progress</MenuItem>
									<MenuItem value="Closed">Closed</MenuItem>
								</TextField>
							</Grid>

							<Grid item xs={12} sm={6}>
								<TextField
									fullWidth
									label="Invoice ID"
									value={editRow.invoice_id || "-"}
									InputProps={{ readOnly: true }}
								/>
							</Grid>
							<Grid item xs={12} sm={6}>
								<TextField
									fullWidth
									label="Order ID"
									value={editRow.order_id}
									InputProps={{ readOnly: true }}
								/>
							</Grid>

							<Grid item xs={12}>
								<TextField
									fullWidth
									label="Dealer"
									value={dealersMap[editRow.dealer_id]?.full_name || editRow.dealer_id}
									InputProps={{ readOnly: true }}
								/>
							</Grid>

							<Grid item xs={12}>
								<TextField
									fullWidth
									label="Notes"
									value={editNotes}
									onChange={(e) => setEditNotes(e.target.value)}
									multiline
									minRows={3}
								/>
							</Grid>

							<Grid item xs={12}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Button
										size="small"
										startIcon={<CloudUploadIcon />}
										variant="outlined"
										onClick={() => {
											const input = document.createElement("input");
											input.type = "file";
											input.accept = "*/*";
											input.onchange = (e: any) => uploadInEdit(e.target.files?.[0]);
											input.click();
										}}
									>
										Upload Attachment
									</Button>
									{editRow.filename && (
										<a
											href={`/uploads/lr-receipts/${editRow.file_path}`}
											target="_blank"
											rel="noopener noreferrer"
										>
											{editRow.filename}
										</a>
									)}
								</Box>
							</Grid>
						</Grid>
					) : (
						<Typography>No SR selected</Typography>
					)}
				</DialogContent>
				<DialogActions>
					<Button variant="outlined" onClick={() => setEditOpen(false)}>Cancel</Button>
					<Button variant="contained" onClick={submitEdit} disabled={!editRow}>
						Save
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
