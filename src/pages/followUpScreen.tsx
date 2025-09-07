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
//import DeleteIcon from "@mui/icons-material/Delete";
//import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import { http } from "../lib/http";
import { useNavigate } from "react-router-dom";

/** Types */
type FollowUp = {
  followup_id: string;
  entity_type: 'order' | 'quote' | 'sr';
  entity_id: string;
  invoice_id?: string; // Optional invoice_id for service requests
  lr_number?: string; // Optional lr_number for LR receipts
  assigned_to: number;
  created_by: number;
  status: 'Pending' | 'In Progress' | 'Completed';
  due_date: string | null;
  notes: string | null;
}

/** API helpers */
async function fetchFollowUps(): Promise<FollowUp[]> {
	const userRole = localStorage.getItem('userRole');
	const userId = localStorage.getItem('user_id');
	let url = `/followups?userRole=${userRole}`;
	if (userRole?.toLowerCase() === 'Employee'.toLowerCase()) {
		url = `/followups?userRole=${userRole}&userId=${userId}`;
	}
	const { data } = await http.get(url);
	return data ?? [];
}
async function updateFollowUp(id: string, patch: Partial<FollowUp>) {
	await http.put(`/followups/${id}`, patch);
}

export default function FollowUpScreen() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const navigate = useNavigate();

	const [rows, setRows] = useState<FollowUp[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");

	// dialogs
	const [detailOpen, setDetailOpen] = useState(false);
	const [activeTab, setActiveTab] = useState(0);
	const [selected, setSelected] = useState<FollowUp | null>(null);

	useEffect(() => {
		(async () => {
			try {
				setLoading(true);
				setRows(await fetchFollowUps());
				setError(null);
			} catch {
				setError("Failed to load follow-ups.");
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((d) =>
			[d.followup_id, d.entity_type, d.entity_id, d.status]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q))
		);
	}, [rows, search]);

	const handleViewDetails = (d: FollowUp) => {
		setSelected(d);
		setDetailOpen(true);
	};

	/** Inline edit save */
	const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
		const id = String(newRow.followup_id);
		const patch: Partial<FollowUp> = {};
		([
			"assigned_to",
			"status",
			"due_date",
			"notes",
		] as const).forEach((k) => {
			if (newRow[k] !== oldRow[k]) (patch as any)[k] = newRow[k];
		});
		if (Object.keys(patch).length) {
			await updateFollowUp(id, patch);
			setRows((prev) => prev.map((r) => (r.followup_id === id ? { ...r, ...patch } : r)));
		}
		return newRow;
	};

	/** DataGrid columns (desktop) */
	const columns: GridColDef[] = [
		{
			field: "followup_id",
			headerName: "Follow-Up ID",
			flex: 1,
			minWidth: 150,
			renderCell: (p) => {
				const { entity_type, entity_id } = p.row as FollowUp;
				let path = '';
				if (entity_type === 'quote') {
					path = `/quotation-items/${entity_id}`;
				} else if (entity_type === 'sr') {
					path = `/serviceRequest/${entity_id}`;
				} else if (entity_type === 'lr') {
					path = `/lr-item?id=${entity_id}`;
				}
				return <Button onClick={() => navigate(path)}>{p.value}</Button>
			}
		},
		{
			field: "entity_type",
			headerName: "Entity Type",
			flex: 1,
			minWidth: 150,
		},
		{
			field: "entity_id",
			headerName: "Entity ID",
			flex: 1,
			minWidth: 150,
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
					color={p.value === "Completed" ? "success" : p.value === "Pending" ? "warning" : "info"}
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
			minWidth: 100,
			flex: 0.9,
			renderCell: (p) => {
				const d = p.row as FollowUp;
				return (
					<Box sx={{ display: "flex", gap: 0.5 }}>
						<Tooltip title="Details">
							<IconButton size="small" onClick={() => handleViewDetails(d)}>
								<EditIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					</Box>
				);
			},
		},
	];

	const gridRows = useMemo(() => filtered.map((d) => ({ id: d.followup_id, ...d })), [filtered]);

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
									<Grid item xs={12} key={d.followup_id}>
										<Card variant="outlined" sx={{ borderRadius: 2 }}>
											<CardContent sx={{ py: 1.25 }}>
												<Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
													<Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: "primary.main" }}>
														{d.followup_id?.[0] ?? "?"}
													</Avatar>
													<Box sx={{ minWidth: 0, flex: 1 }}>
														<Typography fontWeight={700} noWrap title={d.followup_id}>
															{d.followup_id}
														</Typography>
														<Typography variant="caption" color="text.secondary" noWrap>
															{d.entity_type}
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
					<Typography variant="h6">Follow-Up Details</Typography>
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
						<Typography>No follow-up selected</Typography>
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