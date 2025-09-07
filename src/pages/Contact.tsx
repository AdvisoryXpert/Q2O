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
	Tab,
	Tabs,
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
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
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

/** API helpers */
async function fetchDealers(): Promise<Dealer[]> {
	const { data } = await http.get("/dealers");
	return data ?? [];
}
async function updateDealer(id: string, patch: Partial<Dealer>) {
	await http.put(`/dealers/${id}`, patch);
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
	const [detailOpen, setDetailOpen] = useState(false);
	const [activeTab, setActiveTab] = useState(0);
	const [selected, setSelected] = useState<Dealer | null>(null);

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

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((d) =>
			[d.full_name, d.email, d.phone, d.location, d.account_type, d.dealer_type]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q))
		);
	}, [rows, search]);

	const handleViewQuotes = (d: Dealer) => {
		setSelected(d);
		setQuoteOpen(true);
	};
	const handleViewDetails = (d: Dealer) => {
		setSelected(d);
		setDetailOpen(true);
	};
	const handleDelete = async (d: Dealer) => {
		try {
			const { data } = await http.get(`/dealers/${d.dealer_id}/quotations/count`);
			if (data.quotationCount > 0) {
				window.alert("This dealer has existing quotations and cannot be deleted.");
				return;
			}
			if (window.confirm(`Delete dealer "${d.full_name}"?`)) {
				await http.delete(`/dealers/${d.dealer_id}`);
				setRows((prev) => prev.filter((r) => r.dealer_id !== d.dealer_id));
			}
		} catch {
			window.alert("Failed to delete dealer. Please try again.");
		}
	};

	/** Inline edit save */
	const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
		const id = String(newRow.dealer_id || newRow.id);
		const patch: Partial<Dealer> = {};
		(["full_name", "email", "phone", "location", "account_type"] as const).forEach((k) => {
			if (newRow[k] !== oldRow[k]) (patch as any)[k] = newRow[k];
		});
		if (Object.keys(patch).length) {
			await updateDealer(id, patch);
			setRows((prev) => prev.map((r) => (r.dealer_id === id ? { ...r, ...patch } : r)));
		}
		return newRow;
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
			renderCell: (p) =>
				Number(p.value) === 1 ? <StarIcon color="warning" fontSize="small" /> : <StarBorderIcon fontSize="small" />,
		},
		{
			field: "full_name",
			headerName: "Dealer",
			flex: 1.6,
			minWidth: 280, // bigger so it doesn't wrap
			editable: true,
			renderCell: (p) => {
				const d = p.row as Dealer;
				return (
					<Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
						<Avatar sx={{ width: 28, height: 28, mr: 1, bgcolor: "primary.main", fontSize: 12 }}>
							{d.full_name?.[0] ?? "?"}
						</Avatar>
						<Box sx={{ minWidth: 0 }}>
							<Typography
								fontWeight={700}
								noWrap
								title={d.full_name}
								sx={{ whiteSpace: "nowrap", lineHeight: 1.2 }}
							>
								{d.full_name}
							</Typography>
							{d.dealer_type && (
								<Typography
									noWrap
									variant="caption"
									color="text.secondary"
									title={d.dealer_type}
									sx={{ whiteSpace: "nowrap" }}
								>
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
					sx={{
						height: 24,
						"& .MuiChip-label": { px: 1, fontSize: 12, fontWeight: 600 },
					}}
				/>
			),
		},
		{
			field: "actions",
			headerName: "Actions",
			sortable: false,
			filterable: false,
			disableColumnMenu: true,
			minWidth: 140,
			flex: 0.9,
			renderCell: (p) => {
				const d = p.row as Dealer;
				return (
					<Box sx={{ display: "flex", gap: 0.5 }}>
						<Tooltip title="View Quotes">
							<IconButton size="small" color="primary" onClick={() => handleViewQuotes(d)}>
								<VisibilityIcon fontSize="small" />
							</IconButton>
						</Tooltip>
						<Tooltip title="Details">
							<IconButton size="small" onClick={() => handleViewDetails(d)}>
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

	const gridRows = useMemo(() => filtered.map((d) => ({ id: d.dealer_id, ...d })), [filtered]);

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
							// Bigger + colourful styling
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
					// mobile cards unchanged
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
								{filtered.map((d) => (
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
													{Number(d.is_important) === 1 ? (
														<StarIcon color="warning" fontSize="small" />
													) : (
														<StarBorderIcon fontSize="small" />
													)}
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
													<Tooltip title="Details">
														<IconButton size="small" onClick={() => handleViewDetails(d)}>
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
								))}
							</Grid>
						</Box>
					)}
				</Box>
			</Paper>

			{/* Details dialog */}
			<Dialog
				open={detailOpen}
				onClose={() => setDetailOpen(false)}
				fullWidth
				maxWidth="md"
				PaperProps={{ sx: { borderRadius: 2 } }}
			>
				<DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<Typography variant="h6">Dealer Details</Typography>
					<IconButton onClick={() => setDetailOpen(false)} size="small">
						<CloseIcon />
					</IconButton>
				</DialogTitle>
				<DialogContent dividers>
					{selected ? (
						<Box>
							<Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
								<Avatar sx={{ width: 56, height: 56, mr: 2, bgcolor: "primary.main" }}>
									{selected.full_name?.[0] ?? "?"}
								</Avatar>
								<Box>
									<Typography variant="h6">
										{selected.full_name}
										{Number(selected.is_important) === 1 && (
											<StarIcon color="warning" sx={{ ml: 1, verticalAlign: "text-bottom" }} />
										)}
									</Typography>
									<Chip label={selected.dealer_type || "-"} size="small" />
								</Box>
							</Box>

							<Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 1 }}>
								<Tab label="Overview" />
								<Tab label="Details" />
							</Tabs>

							{activeTab === 0 && (
								<Grid container spacing={2}>
									<Grid item xs={12} sm={6}>
										<Card variant="outlined">
											<CardContent>
												<Typography variant="subtitle1" sx={{ display: "flex", alignItems: "center" }}>
													<PersonIcon sx={{ mr: 1 }} /> Contact Information
												</Typography>
												<Box sx={{ mt: 1 }}>
													<Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
														<EmailIcon sx={{ mr: 1, color: "text.secondary" }} />
														<Typography>{selected.email}</Typography>
													</Box>
													<Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
														<PhoneIcon sx={{ mr: 1, color: "text.secondary" }} />
														<Typography>{selected.phone}</Typography>
													</Box>
													<Box sx={{ display: "flex", alignItems: "center" }}>
														<PlaceIcon sx={{ mr: 1, color: "text.secondary" }} />
														<Typography>{selected.location}</Typography>
													</Box>
												</Box>
											</CardContent>
										</Card>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Card variant="outlined">
											<CardContent>
												<Typography variant="subtitle1" sx={{ display: "flex", alignItems: "center" }}>
													<BusinessIcon sx={{ mr: 1 }} /> Account Information
												</Typography>
												<Box sx={{ mt: 1 }}>
													<Chip label={selected.account_type || "-"} size="small" variant="outlined" />
													{selected.gst_number && (
														<Typography sx={{ mt: 1 }}>GST: {selected.gst_number}</Typography>
													)}
													<Typography sx={{ mt: 1 }}>
														Since: {new Date(selected.date_created).toLocaleDateString()}
													</Typography>
												</Box>
											</CardContent>
										</Card>
									</Grid>
								</Grid>
							)}

							{activeTab === 1 && (
								<Grid container spacing={2}>
									<Grid item xs={12} sm={6}>
										<TextField fullWidth label="Full Name" value={selected.full_name} InputProps={{ readOnly: true }} />
									</Grid>
									<Grid item xs={12} sm={6}>
										<TextField fullWidth label="Email" value={selected.email} InputProps={{ readOnly: true }} />
									</Grid>
									<Grid item xs={12} sm={6}>
										<TextField fullWidth label="Phone" value={selected.phone} InputProps={{ readOnly: true }} />
									</Grid>
									<Grid item xs={12} sm={6}>
										<TextField fullWidth label="Location" value={selected.location} InputProps={{ readOnly: true }} />
									</Grid>
									<Grid item xs={12} sm={6}>
										<TextField fullWidth label="Dealer Type" value={selected.dealer_type || ""} InputProps={{ readOnly: true }} />
									</Grid>
									<Grid item xs={12} sm={6}>
										<TextField fullWidth label="Account Type" value={selected.account_type || ""} InputProps={{ readOnly: true }} />
									</Grid>
								</Grid>
							)}
						</Box>
					) : (
						<Typography>No dealer selected</Typography>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDetailOpen(false)} variant="outlined">
						Close
					</Button>
				</DialogActions>
			</Dialog>

			{/* Quotes dialog */}
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
		</>
	);
}
