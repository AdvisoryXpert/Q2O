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
	TextField,
	Toolbar,
	Tooltip,
	Typography,
	useMediaQuery,
	useTheme,
	Snackbar,
	Alert,
	FormControlLabel,
	Switch,
	Divider,
} from "@mui/material";
import {
	DataGrid,
	GridColDef,
	GridRowModel,
	GridToolbar,
} from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import PlaceIcon from "@mui/icons-material/Place";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import { http } from "../lib/http";
import QuotationPage from "./QuotationPage";

/** Types */
type Dealer = {
  dealer_id: string;
  full_name: string;
  location: string;
  email: string;
  phone: string;
  date_created: string;
  is_important?: number | boolean;
  dealer_type?: string;
  account_type?: string;
  gst_number?: string;
};

type DealerForm = {
  full_name: string;
  email?: string;
  phone?: string;
  location?: string;
  dealer_type?: string;
  account_type?: string;
  gst_number?: string;
  is_important?: boolean;
};

/** API helpers */
async function fetchDealers(): Promise<Dealer[]> {
	const { data } = await http.get("/dealers");
	return data ?? [];
}
async function createDealer(payload: DealerForm): Promise<Dealer> {
	const { data } = await http.post("/dealers", payload);
	return data;
}
async function updateDealer(id: string, patch: Partial<Dealer>) {
	await http.put(`/dealers/${id}`, patch);
}
async function deleteDealer(id: string) {
	await http.delete(`/dealers/${id}`);
}
async function countDealerQuotations(id: string): Promise<number> {
	const { data } = await http.get(`/dealers/${id}/quotations/count`);
	return data?.quotationCount ?? 0;
}

export default function Contact() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

	const [rows, setRows] = useState<Dealer[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");

	// dialogs
	const [quoteOpen, setQuoteOpen] = useState(false);
	const [formOpen, setFormOpen] = useState(false);
	const [formMode, setFormMode] = useState<"create" | "edit">("create");
	const [selected, setSelected] = useState<Dealer | null>(null);

	// form state
	const emptyForm: DealerForm = {
		full_name: "",
		email: "",
		phone: "",
		location: "",
		dealer_type: "",
		account_type: "",
		gst_number: "",
		is_important: false,
	};
	const [form, setForm] = useState<DealerForm>(emptyForm);
	const [saving, setSaving] = useState(false);

	// snack
	const [snack, setSnack] = useState<{ open: boolean; msg: string; type: "success" | "error" }>({
		open: false,
		msg: "",
		type: "success",
	});

	useEffect(() => {
		(async () => {
			try {
				setLoading(true);
				setRows(await fetchDealers());
				setError(null);
			} catch {
				setError("Failed to load dealers.");
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	/** Search filter */
	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((d) =>
			[d.full_name, d.email, d.phone, d.location, d.account_type, d.dealer_type, d.gst_number]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q))
		);
	}, [rows, search]);

	const gridRows = useMemo(() => filtered.map((d) => ({ id: d.dealer_id, ...d })), [filtered]);

	/** Handlers */
	const openCreate = () => {
		setFormMode("create");
		setSelected(null);
		setForm(emptyForm);
		setFormOpen(true);
	};

	const openEdit = (d: Dealer) => {
		setFormMode("edit");
		setSelected(d);
		setForm({
			full_name: d.full_name ?? "",
			email: d.email ?? "",
			phone: d.phone ?? "",
			location: d.location ?? "",
			dealer_type: d.dealer_type ?? "",
			account_type: d.account_type ?? "",
			gst_number: d.gst_number ?? "",
			is_important: Number(d.is_important) === 1 || d.is_important === true,
		});
		setFormOpen(true);
	};

	const handleViewQuotes = (d: Dealer) => {
		setSelected(d);
		setQuoteOpen(true);
	};

	const handleToggleImportant = async (d: Dealer) => {
		const id = String(d.dealer_id);
		const next = !(Number(d.is_important) === 1 || d.is_important === true);
		try {
			await updateDealer(id, { is_important: next ? 1 : 0 });
			setRows((prev) => prev.map((r) => (r.dealer_id === id ? { ...r, is_important: next ? 1 : 0 } : r)));
		} catch (e: any) {
			setSnack({ open: true, msg: e?.response?.data?.message || "Failed to update", type: "error" });
		}
	};

	const handleDelete = async (d: Dealer) => {
		try {
			const count = await countDealerQuotations(d.dealer_id);
			if (count > 0) {
				window.alert("This dealer has existing quotations and cannot be deleted.");
				return;
			}
			if (window.confirm(`Delete dealer "${d.full_name}"?`)) {
				await deleteDealer(d.dealer_id);
				setRows((prev) => prev.filter((r) => r.dealer_id !== d.dealer_id));
				setSnack({ open: true, msg: "Deleted", type: "success" });
			}
		} catch (e: any) {
			setSnack({ open: true, msg: e?.response?.data?.message || "Failed to delete", type: "error" });
		}
	};

	/** Inline edit save */
	const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
		const id = String(newRow.dealer_id || newRow.id);
		const patch: Partial<Dealer> = {};
		([
			"full_name",
			"email",
			"phone",
			"location",
			"account_type",
			"dealer_type",
			"gst_number",
			"is_important",
		] as const).forEach((k) => {
			if (newRow[k] !== oldRow[k]) (patch as any)[k] = newRow[k];
		});
		if (Object.keys(patch).length) {
			// normalize is_important to 0/1
			if (typeof patch.is_important === "boolean") {
				patch.is_important = patch.is_important ? 1 : 0;
			}
			await updateDealer(id, patch);
			setRows((prev) => prev.map((r) => (r.dealer_id === id ? { ...r, ...patch } : r)));
		}
		return newRow;
	};

	/** Save form */
	const saveForm = async () => {
		// minimal validation
		if (!form.full_name || !form.full_name.trim()) {
			setSnack({ open: true, msg: "Full name is required", type: "error" });
			return;
		}
		if (form.gst_number && form.gst_number.trim() && form.gst_number.trim().length !== 15) {
			setSnack({ open: true, msg: "GST number must be 15 characters", type: "error" });
			return;
		}

		setSaving(true);
		try {
			const payload: DealerForm = {
				...form,
				is_important: !!form.is_important,
			};

			if (formMode === "create") {
				await createDealer(payload);
				// safest: refetch to get server ids/defaults
				setRows(await fetchDealers());
				setSnack({ open: true, msg: "Dealer created", type: "success" });
			} else if (formMode === "edit" && selected?.dealer_id) {
				await updateDealer(String(selected.dealer_id), {
					...payload,
					is_important: payload.is_important ? 1 : 0,
				});
				setRows((prev) =>
					prev.map((r) =>
						r.dealer_id === selected.dealer_id
							? { ...r, ...payload, is_important: payload.is_important ? 1 : 0 }
							: r
					)
				);
				setSnack({ open: true, msg: "Dealer updated", type: "success" });
			}
			setFormOpen(false);
		} catch (e: any) {
			setSnack({ open: true, msg: e?.response?.data?.message || "Save failed", type: "error" });
		} finally {
			setSaving(false);
		}
	};

	/** DataGrid columns (desktop) */
	const columns: GridColDef[] = [
		{
			field: "is_important",
			headerName: "",
			width: 56,
			sortable: false,
			filterable: false,
			disableColumnMenu: true,
			renderCell: (p) => {
				const highlighted = Number(p.value) === 1 || p.value === true;
				return (
					<IconButton
						size="small"
						onClick={(e) => {
							e.stopPropagation();
							handleToggleImportant(p.row as Dealer);
						}}
						aria-label={highlighted ? "Unmark important" : "Mark important"}
					>
						{highlighted ? <StarIcon color="warning" fontSize="small" /> : <StarBorderIcon fontSize="small" />}
					</IconButton>
				);
			},
		},
		{
			field: "full_name",
			headerName: "Dealer",
			flex: 1.6,
			minWidth: 280,
			editable: true,
			renderCell: (p) => {
				const d = p.row as Dealer;
				return (
					<Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
						<Avatar sx={{ width: 28, height: 28, mr: 1, bgcolor: "primary.main", fontSize: 12 }}>
							{d.full_name?.[0] ?? "?"}
						</Avatar>
						<Box sx={{ minWidth: 0 }}>
							<Typography fontWeight={700} noWrap title={d.full_name} sx={{ whiteSpace: "nowrap", lineHeight: 1.2 }}>
								{d.full_name}
							</Typography>
							{d.dealer_type && (
								<Typography noWrap variant="caption" color="text.secondary" title={d.dealer_type} sx={{ whiteSpace: "nowrap" }}>
									{d.dealer_type}
								</Typography>
							)}
						</Box>
					</Box>
				);
			},
		},
		{
			field: "email",
			headerName: "Email",
			flex: 1.1,
			minWidth: 200,
			editable: true,
			renderCell: (p) => (
				<Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
					<EmailIcon sx={{ fontSize: 14, mr: 0.5, color: "text.secondary" }} />
					<Typography variant="body2" noWrap title={String(p.value ?? "")}>
						{p.value}
					</Typography>
				</Box>
			),
		},
		{
			field: "phone",
			headerName: "Phone",
			flex: 1,
			minWidth: 140,
			editable: true,
			renderCell: (p) => (
				<Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
					<PhoneIcon sx={{ fontSize: 14, mr: 0.5, color: "text.secondary" }} />
					<Typography variant="body2" noWrap title={String(p.value ?? "")}>
						{p.value}
					</Typography>
				</Box>
			),
		},
		{
			field: "location",
			headerName: "Location",
			flex: 1.1,
			minWidth: 140,
			editable: true,
			renderCell: (p) => (
				<Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
					<PlaceIcon sx={{ fontSize: 14, mr: 0.5, color: "text.secondary" }} />
					<Typography noWrap title={String(p.value ?? "")}>
						{p.value}
					</Typography>
				</Box>
			),
		},
		{
			field: "dealer_type",
			headerName: "Dealer Type",
			flex: 1,
			minWidth: 140,
			editable: true,
			renderCell: (p) => (
				<Chip
					label={p.value || "-"}
					size="small"
					color="secondary"
					variant="outlined"
					sx={{ height: 24, "& .MuiChip-label": { px: 1, fontSize: 12, fontWeight: 600 } }}
				/>
			),
		},
		{
			field: "account_type",
			headerName: "Account",
			flex: 1,
			minWidth: 130,
			editable: true,
			renderCell: (p) => (
				<Chip
					label={p.value || "-"}
					size="small"
					color="primary"
					variant="filled"
					sx={{ height: 24, "& .MuiChip-label": { px: 1, fontSize: 12, fontWeight: 600 } }}
				/>
			),
		},
		{
			field: "gst_number",
			headerName: "GST",
			flex: 0.9,
			minWidth: 130,
			editable: true,
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
				const d = p.row as Dealer;
				return (
					<Box sx={{ display: "flex", gap: 0.5 }}>
						<Tooltip title="Quotations">
							<IconButton size="small" color="primary" onClick={() => handleViewQuotes(d)}>
								<VisibilityIcon fontSize="small" />
							</IconButton>
						</Tooltip>
						<Tooltip title="Edit">
							<IconButton size="small" onClick={() => openEdit(d)}>
								<EditIcon fontSize="small" />
							</IconButton>
						</Tooltip>
						<Tooltip title="Delete">
							<IconButton size="small" color="error" onClick={() => handleDelete(d)}>
								<DeleteIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					</Box>
				);
			},
		},
	];

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
								placeholder="Search dealers..."
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
								sx={{
									textTransform: "none",
									fontWeight: 700,
								}}
							>
								New Dealer
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
									background: "linear-gradient(90deg, rgba(7,71,166,0.07) 0%, rgba(7,71,166,0.03) 100%)",
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
					// mobile cards
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
								{filtered.map((d) => {
									const highlighted = Number(d.is_important) === 1 || d.is_important === true;
									return (
										<Grid item xs={12} key={d.dealer_id}>
											<Card variant="outlined" sx={{ borderRadius: 2 }}>
												<CardContent sx={{ py: 1.25 }}>
													<Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
														<Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: "primary.main" }}>
															{d.full_name?.[0] ?? "?"}
														</Avatar>
														<Box sx={{ minWidth: 0, flex: 1 }}>
															<Typography fontWeight={700} noWrap title={d.full_name}>
																{d.full_name}
															</Typography>
															<Typography variant="caption" color="text.secondary" noWrap>
																{d.dealer_type}
															</Typography>
														</Box>
														<IconButton size="small" onClick={() => handleToggleImportant(d)} aria-label="toggle important">
															{highlighted ? <StarIcon color="warning" fontSize="small" /> : <StarBorderIcon fontSize="small" />}
														</IconButton>
													</Box>

													<Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
														<EmailIcon sx={{ fontSize: 14, mr: 0.5, color: "text.secondary" }} />
														<Typography variant="body2" noWrap title={d.email}>
															{d.email}
														</Typography>
													</Box>
													<Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
														<PhoneIcon sx={{ fontSize: 14, mr: 0.5, color: "text.secondary" }} />
														<Typography variant="body2" noWrap title={d.phone}>
															{d.phone}
														</Typography>
													</Box>
													<Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
														<PlaceIcon sx={{ fontSize: 14, mr: 0.5, color: "text.secondary" }} />
														<Typography variant="body2" noWrap title={d.location}>
															{d.location}
														</Typography>
													</Box>

													<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
														<Chip
															label={d.account_type || "-"}
															size="small"
															color="primary"
															variant="filled"
															sx={{ height: 22, "& .MuiChip-label": { px: 0.75, fontSize: 11 } }}
														/>
														<Box sx={{ flex: 1 }} />
														<Tooltip title="Quotes">
															<IconButton size="small" color="primary" onClick={() => handleViewQuotes(d)}>
																<VisibilityIcon fontSize="small" />
															</IconButton>
														</Tooltip>
														<Tooltip title="Edit">
															<IconButton size="small" onClick={() => openEdit(d)}>
																<EditIcon fontSize="small" />
															</IconButton>
														</Tooltip>
														<Tooltip title="Delete">
															<IconButton size="small" color="error" onClick={() => handleDelete(d)}>
																<DeleteIcon fontSize="small" />
															</IconButton>
														</Tooltip>
													</Box>
												</CardContent>
											</Card>
										</Grid>
									);
								})}
							</Grid>
						</Box>
					)}
				</Box>
			</Paper>

			{/* Create / Edit dialog */}
			<Dialog
				open={formOpen}
				onClose={() => setFormOpen(false)}
				fullWidth
				fullScreen={isMobile}
				maxWidth="md"
				PaperProps={{ sx: { borderRadius: 2 } }}
			>
				<DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<Typography variant="h6">{formMode === "create" ? "New Dealer" : "Edit Dealer"}</Typography>
					<IconButton onClick={() => setFormOpen(false)} size="small">
						<CloseIcon />
					</IconButton>
				</DialogTitle>
				<DialogContent dividers>
					<Grid container spacing={2}>
						<Grid item xs={12} sm={6}>
							<TextField
								required
								fullWidth
								label="Full Name"
								value={form.full_name}
								onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								type="email"
								fullWidth
								label="Email"
								value={form.email || ""}
								onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Phone"
								value={form.phone || ""}
								onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Location"
								value={form.location || ""}
								onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Dealer Type"
								placeholder="Dealer / Distributor / Technician / SME"
								value={form.dealer_type || ""}
								onChange={(e) => setForm((f) => ({ ...f, dealer_type: e.target.value }))}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Account Type"
								placeholder="Retail / B2B / OEM ..."
								value={form.account_type || ""}
								onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value }))}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="GST Number"
								placeholder="15 characters"
								value={form.gst_number || ""}
								onChange={(e) => setForm((f) => ({ ...f, gst_number: e.target.value.toUpperCase() }))}
								inputProps={{ maxLength: 15 }}
							/>
						</Grid>
						<Grid item xs={12} sm={6} sx={{ display: "flex", alignItems: "center" }}>
							<FormControlLabel
								control={
									<Switch
										checked={!!form.is_important}
										onChange={(e) => setForm((f) => ({ ...f, is_important: e.target.checked }))}
									/>
								}
								label="Mark as Important"
							/>
						</Grid>
					</Grid>

					{formMode === "edit" && selected && (
						<>
							<Divider sx={{ my: 2 }} />
							<Grid container spacing={2}>
								<Grid item xs={12} sm={6}>
									<TextField fullWidth label="Created On" value={new Date(selected.date_created).toLocaleString()} InputProps={{ readOnly: true }} />
								</Grid>
								<Grid item xs={12} sm={6}>
									<TextField fullWidth label="Dealer ID" value={selected.dealer_id} InputProps={{ readOnly: true }} />
								</Grid>
							</Grid>
						</>
					)}
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

			{/* Quotes dialog (unchanged, just styled header retained) */}
			<Dialog
				open={quoteOpen}
				onClose={() => setQuoteOpen(false)}
				fullWidth
				maxWidth="xl"
				PaperProps={{ sx: { borderRadius: 2, minHeight: "80vh" } }}
			>
				<DialogTitle
					sx={{
						bgcolor: "primary.main",
						color: "white",
						fontWeight: "bold",
						textAlign: "center",
						py: 1.25,
					}}
				>
					Quotations for {selected?.full_name}
				</DialogTitle>
				<DialogContent sx={{ p: 0 }}>
					{selected ? (
						<QuotationPage dealerId={selected.dealer_id} />
					) : (
						<Box sx={{ p: 3, textAlign: "center" }}>
							<Typography>No dealer selected</Typography>
						</Box>
					)}
				</DialogContent>
				<DialogActions sx={{ p: 2 }}>
					<Button onClick={() => setQuoteOpen(false)} variant="outlined">
						Close
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
