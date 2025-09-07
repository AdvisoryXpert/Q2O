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
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import { http } from "../lib/http";

/** Types */
type LRReceipt = {
  id: string;
  lr_number: string;
  product_name: string;
  manufacturer_name: string;
  description: string;
  status: string;
  executive: string;
  phone: string;
  file_path?: string;
  user_id?: string;
};

/** API helpers */
async function fetchLRReceipts(): Promise<LRReceipt[]> {
	const { data } = await http.get("/lr-receipts");
	return data ?? [];
}
async function updateLRReceipt(id: string, patch: Partial<LRReceipt>) {
	await http.put(`/lr-receipts/${id}`, patch);
}

export default function LRReceiptPage() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

	const [rows, setRows] = useState<LRReceipt[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");

	// dialogs
	const [detailOpen, setDetailOpen] = useState(false);
	const [activeTab, setActiveTab] = useState(0);
	const [selected, setSelected] = useState<LRReceipt | null>(null);

	useEffect(() => {
		(async () => {
			try {
				setLoading(true);
				setRows(await fetchLRReceipts());
				setError(null);
			} catch {
				setError("Failed to load LR receipts.");
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((d) =>
			[d.lr_number, d.product_name, d.manufacturer_name, d.executive]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q))
		);
	}, [rows, search]);

	const handleViewDetails = (d: LRReceipt) => {
		setSelected(d);
		setDetailOpen(true);
	};

	const handleDelete = async (d: LRReceipt) => {
		if (window.confirm(`Delete LR Receipt "${d.lr_number}"?`)) {
			try {
				await http.delete(`/lr-receipts/${d.id}`);
				setRows((prev) => prev.filter((r) => r.id !== d.id));
			} catch {
				window.alert("Failed to delete LR Receipt. Please try again.");
			}
		}
	};

	/** Inline edit save */
	const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
		const id = String(newRow.id);
		const patch: Partial<LRReceipt> = {};
		([
			"lr_number",
			"product_name",
			"manufacturer_name",
			"description",
			"status",
			"executive",
			"phone",
		] as const).forEach((k) => {
			if (newRow[k] !== oldRow[k]) (patch as any)[k] = newRow[k];
		});
		if (Object.keys(patch).length) {
			await updateLRReceipt(id, patch);
			setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
		}
		return newRow;
	};

	/** DataGrid columns (desktop) */
	const columns: GridColDef[] = [
		{
			field: "lr_number",
			headerName: "LR Number",
			flex: 1,
			minWidth: 150,
			editable: true,
		},
		{
			field: "product_name",
			headerName: "Product Name",
			flex: 1,
			minWidth: 150,
			editable: true,
		},
		{
			field: "manufacturer_name",
			headerName: "Manufacturer",
			flex: 1,
			minWidth: 150,
			editable: true,
		},
		{
			field: "executive",
			headerName: "Executive",
			flex: 1,
			minWidth: 150,
			editable: true,
		},
		{
			field: "status",
			headerName: "Status",
			flex: 1,
			minWidth: 120,
			editable: true,
			renderCell: (p) => (
				<Chip
					label={p.value || "-"}
					size="small"
					color={p.value === "Open" ? "success" : p.value === "Closed" ? "error" : "warning"}
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
				const d = p.row as LRReceipt;
				return (
					<Box sx={{ display: "flex", gap: 0.5 }}>
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

	const gridRows = useMemo(() => filtered.map((d) => ({ id: d.id, ...d })), [filtered]);

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
								placeholder="Search..."
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
								New LR Receipt
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
									<Grid item xs={12} key={d.id}>
										<Card variant="outlined" sx={{ borderRadius: 2 }}>
											<CardContent sx={{ py: 1.25 }}>
												<Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
													<Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: "primary.main" }}>
														{d.lr_number?.[0] ?? "?"}
													</Avatar>
													<Box sx={{ minWidth: 0, flex: 1 }}>
														<Typography fontWeight={700} noWrap title={d.lr_number}>
															{d.lr_number}
														</Typography>
														<Typography variant="caption" color="text.secondary" noWrap>
															{d.product_name}
														</Typography>
													</Box>
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
					<Typography variant="h6">LR Receipt Details</Typography>
					<IconButton onClick={() => setDetailOpen(false)} size="small">
						<CloseIcon />
					</IconButton>
				</DialogTitle>
				<DialogContent dividers>
					{selected ? (
						<Box>
							<Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 1 }}>
								<Tab label="Overview" />
								<Tab label="Details" />
							</Tabs>

							{activeTab === 0 && (
								<Grid container spacing={2}>
									{/* Overview content here */}
								</Grid>
							)}

							{activeTab === 1 && (
								<Grid container spacing={2}>
									{/* Details content here */}
								</Grid>
							)}
						</Box>
					) : (
						<Typography>No receipt selected</Typography>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDetailOpen(false)} variant="outlined">
						Close
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}