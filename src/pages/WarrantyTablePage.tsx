// src/pages/WarrantyTablePage.tsx
import { useEffect, useMemo, useState } from "react";
import {
	AppBar,
	Avatar,
	Box,
	Button,
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
	Tab,
	Tabs,
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
import EditIcon from "@mui/icons-material/Edit";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import { useSearchParams } from "react-router-dom";

// Use your existing helper; this assumes axios-like wrapper with get/put
import { http } from "../lib/http";

/* Types */
type Warranty = {
  warranty_id: number;
  serial_number: string;
  product_id: number;
  name: string;
  dealer_id: number;
  dealer_name: string;
  customer_name: string;
  start_date: string | null;
  end_date: string | null;
  warranty_period: number | null;
  status: "Active" | "Expired";
  invoice_id: string | null;
};

/* Utils */
const toYMD = (s?: string | null) => (s ? String(s).slice(0, 10) : "");

/* API */
async function fetchWarranties(): Promise<Warranty[]> {
	const { data } = await http.get("/warranty");
	return data ?? [];
}
async function updateWarranty(id: number, patch: Partial<Warranty>) {
	await http.put(`/warranty/${id}`, patch);
}

export default function WarrantyTablePage() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const [searchParams] = useSearchParams();

	const [rows, setRows] = useState<Warranty[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState(searchParams.get("serial_number") || "");

	// dialog + local edit state
	const [detailOpen, setDetailOpen] = useState(false);
	const [activeTab, setActiveTab] = useState(0);
	const [selected, setSelected] = useState<Warranty | null>(null);
	const [editStatus, setEditStatus] = useState<Warranty["status"]>("Active");
	const [editEndDate, setEditEndDate] = useState<string>("");

	// snackbar
	const [snack, setSnack] = useState<{ open: boolean; msg: string; type: "success" | "error" }>({
		open: false,
		msg: "",
		type: "success",
	});

	useEffect(() => {
		(async () => {
			try {
				setLoading(true);
				setRows(await fetchWarranties());
				setError(null);
			} catch {
				setError("Failed to load warranties.");
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((d) =>
			[
				d.serial_number,
				d.invoice_id,
				d.name,
				d.dealer_name,
				d.customer_name,
				d.start_date,
				d.end_date,
				d.status,
			]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q))
		);
	}, [rows, search]);

	const openDetails = (d: Warranty) => {
		setSelected(d);
		setEditStatus(d.status);
		setEditEndDate(toYMD(d.end_date));
		setActiveTab(1); // jump straight to Details
		setDetailOpen(true);
	};

	const saveDialogEdits = async () => {
		if (!selected) return;
		const id = selected.warranty_id;
		const patch: Partial<Warranty> = {};

		if (editStatus !== selected.status) patch.status = editStatus;
		if (toYMD(selected.end_date) !== editEndDate) patch.end_date = editEndDate;

		if (!Object.keys(patch).length) {
			setDetailOpen(false);
			return;
		}

		try {
			await updateWarranty(id, patch);
			setRows((prev) => prev.map((r) => (r.warranty_id === id ? { ...r, ...patch } : r)));
			setSnack({ open: true, msg: "Warranty updated", type: "success" });
			setDetailOpen(false);
		} catch (e: any) {
			setSnack({
				open: true,
				msg: e?.response?.data?.message || "Failed to update warranty",
				type: "error",
			});
		}
	};

	/* Columns (read-only grid; edit via dialog) */
	const columns: GridColDef[] = [
		{
			field: "serial_number",
			headerName: "Serial Number",
			flex: 1.1,
			minWidth: 160,
			renderCell: (p) => (
				<Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
					<Avatar sx={{ width: 28, height: 28, mr: 1, bgcolor: "primary.main", fontSize: 12 }}>
						{String(p.value ?? "?")?.[0] ?? "?"}
					</Avatar>
					<Typography noWrap title={String(p.value ?? "")}>
						{p.value}
					</Typography>
				</Box>
			),
		},
		{ field: "invoice_id", headerName: "Invoice ID", flex: 1, minWidth: 140 },
		{ field: "name", headerName: "Product", flex: 1, minWidth: 160 },
		{ field: "dealer_name", headerName: "Dealer", flex: 1, minWidth: 160 },
		{ field: "customer_name", headerName: "Customer", flex: 1, minWidth: 160 },
		{
			field: "start_date",
			headerName: "Start Date",
			flex: 0.9,
			minWidth: 140,
			valueFormatter: (p) => toYMD(p.value as string | null),
			renderCell: (p) => (
				<Typography title={String(p.row.start_date ?? "")}>
					{toYMD(p.row.start_date)}
				</Typography>
			),
		},
		{
			field: "end_date",
			headerName: "End Date",
			flex: 0.9,
			minWidth: 140,
			valueFormatter: (p) => toYMD(p.value as string | null),
			renderCell: (p) => (
				<Typography title={String(p.row.end_date ?? "")}>
					{toYMD(p.row.end_date)}
				</Typography>
			),
		},
		{
			field: "status",
			headerName: "Status",
			flex: 0.8,
			minWidth: 140,
			renderCell: (p) => (
				<Chip
					label={p.value || "-"}
					size="small"
					color={p.value === "Active" ? "success" : "error"}
					variant="filled"
					sx={{ height: 24, "& .MuiChip-label": { px: 1, fontSize: 12, fontWeight: 700 } }}
				/>
			),
		},
		{
			field: "actions",
			headerName: "Actions",
			sortable: false,
			filterable: false,
			disableColumnMenu: true,
			minWidth: 90,
			flex: 0.6,
			renderCell: (p) => (
				<Tooltip title="Edit status & end date">
					<IconButton size="small" onClick={() => openDetails(p.row as Warranty)}>
						<EditIcon fontSize="small" />
					</IconButton>
				</Tooltip>
			),
		},
	];

	const gridRows = useMemo(
		() => filtered.map((d) => ({ id: d.warranty_id, ...d })),
		[filtered]
	);

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
				{/* Top Bar */}
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
						</Box>
						<Tooltip title="Open column filters">
							<IconButton
								size="small"
								onClick={() => {
									const el = document.querySelector(
										'[data-testid="Open filter panel"]'
									) as HTMLElement | null;
									el?.click();
								}}
							>
								<FilterListIcon />
							</IconButton>
						</Tooltip>
					</Toolbar>
				</AppBar>

				{/* Content */}
				<Box sx={{ flex: "1 1 auto", minHeight: 0, overflow: "auto", p: 1.25 }}>
					{error && (
						<Typography color="error" sx={{ mb: 1 }}>
							{error}
						</Typography>
					)}

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
				</Box>
			</Paper>

			{/* Dialog (edit here) */}
			<Dialog
				open={detailOpen}
				onClose={() => setDetailOpen(false)}
				fullWidth
				maxWidth="md"
				PaperProps={{ sx: { borderRadius: 2 } }}
			>
				<DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<Typography variant="h6">Warranty Details</Typography>
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
									<Grid item xs={12} sm={6}>
										<TextField fullWidth label="Serial Number" value={selected.serial_number} InputProps={{ readOnly: true }} />
									</Grid>
									<Grid item xs={12} sm={6}>
										<TextField fullWidth label="Invoice ID" value={selected.invoice_id || "-"} InputProps={{ readOnly: true }} />
									</Grid>
									<Grid item xs={12} sm={6}>
										<TextField fullWidth label="Product" value={selected.name} InputProps={{ readOnly: true }} />
									</Grid>
									<Grid item xs={12} sm={6}>
										<TextField fullWidth label="Dealer" value={selected.dealer_name || "-"} InputProps={{ readOnly: true }} />
									</Grid>
									<Grid item xs={12} sm={6}>
										<TextField fullWidth label="Customer" value={selected.customer_name || "-"} InputProps={{ readOnly: true }} />
									</Grid>
								</Grid>
							)}

							{activeTab === 1 && (
								<Grid container spacing={2}>
									<Grid item xs={12} sm={6}>
										<TextField
											fullWidth
											label="Start Date"
											value={toYMD(selected.start_date)}
											InputProps={{ readOnly: true }}
										/>
									</Grid>

									<Grid item xs={12} sm={6}>
										<TextField
											fullWidth
											type="date"
											label="End Date"
											value={editEndDate}
											onChange={(e) => setEditEndDate(e.target.value)}
											InputLabelProps={{ shrink: true }}
										/>
									</Grid>

									<Grid item xs={12} sm={6}>
										<TextField
											select
											fullWidth
											label="Status"
											value={editStatus}
											onChange={(e) => setEditStatus(e.target.value as Warranty["status"])}
										>
											<MenuItem value="Active">Active</MenuItem>
											<MenuItem value="Expired">Expired</MenuItem>
										</TextField>
									</Grid>

									<Grid item xs={12} sm={6}>
										<TextField
											fullWidth
											label="Warranty Period (months)"
											value={String(selected.warranty_period ?? "")}
											InputProps={{ readOnly: true }}
										/>
									</Grid>
								</Grid>
							)}
						</Box>
					) : (
						<Typography>No warranty selected</Typography>
					)}
				</DialogContent>

				<DialogActions>
					<Button variant="outlined" onClick={() => setDetailOpen(false)}>Close</Button>
					<Button variant="contained" onClick={saveDialogEdits}>Save</Button>
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
