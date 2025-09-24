// src/pages/LRReceiptsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
	AppBar,
	Alert,
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
	Snackbar,
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
	GridToolbar,
} from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import EditIcon from "@mui/icons-material/Edit";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import { getUserId } from "../services/AuthService";
import { useSearchParams } from "react-router-dom";
import { http } from "../lib/http";

/* --------------------- Types --------------------- */
type LRReceipt = {
  id: string;
  lr_number: string;
  product_name: string;
  manufacturer_name: string;
  description: string;
  status: "Open" | "Closed" | "Pending" | string;
  executive: string;
  phone: string;
  file_path?: string;
  filename?: string;
  user_id?: string | number;
};

/* --------------------- API --------------------- */
async function listLR(): Promise<LRReceipt[]> {
	const { data } = await http.get("/lr-receipts");
	return data ?? [];
}
async function createLR(payload: Omit<LRReceipt, "id">) {
	await http.post("/lr-receipts", payload);
}
async function updateLRFull(payload: LRReceipt) {
	await http.put(`/lr-receipts/${payload.id}`, payload);
}
async function uploadLRAttachment(id: string, file: File) {
	const formData = new FormData();
	formData.append("file", file);
	await http.put(`/lr-receipts/${id}/attachment`, formData, {
		headers: { "Content-Type": "multipart/form-data" },
	});
}

/* --------------------- Page --------------------- */
export default function LRReceiptsPage() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	// query filter (?id=XYZ)
	const [searchParams] = useSearchParams();
	const lrIdFromQuery = searchParams.get("id");

	// data
	const [rows, setRows] = useState<LRReceipt[]>([]);

	// ui
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");

	// modals
	const [createOpen, setCreateOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);

	// create model state
	const [c_lr_number, setC_lr_number] = useState("");
	const [c_product_name, setC_product_name] = useState("");
	const [c_manufacturer_name, setC_manufacturer_name] = useState("");
	const [c_description, setC_description] = useState("");
	const [c_status, setC_status] = useState<LRReceipt["status"]>("Open");
	const [c_executive, setC_executive] = useState("");
	const [c_phone, setC_phone] = useState("");

	// edit model state
	const [editRow, setEditRow] = useState<LRReceipt | null>(null);
	const [e_lr_number, setE_lr_number] = useState("");
	const [e_product_name, setE_product_name] = useState("");
	const [e_manufacturer_name, setE_manufacturer_name] = useState("");
	const [e_description, setE_description] = useState("");
	const [e_status, setE_status] = useState<LRReceipt["status"]>("Open");
	const [e_executive, setE_executive] = useState("");
	const [e_phone, setE_phone] = useState("");

	// snack
	const [snack, setSnack] = useState<{ open: boolean; msg: string; type: "success" | "error" }>({
		open: false,
		msg: "",
		type: "success",
	});

	/* Load */
	const loadAll = async () => {
		try {
			setLoading(true);
			const all = await listLR();
			const filtered = lrIdFromQuery ? all.filter((r) => String(r.id) === String(lrIdFromQuery)) : all;
			setRows(filtered);
			setError(null);
		} catch (e: any) {
			setError(e?.message || "Failed to load data.");
		} finally {
			setLoading(false);
		}
	};
	useEffect(() => {
		loadAll();
		 
	}, [lrIdFromQuery]);

	/* Search filter */
	const filteredRows = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((r) =>
			[r.lr_number, r.product_name, r.manufacturer_name, r.description, r.status, r.executive, r.phone]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q))
		);
	}, [rows, search]);

	const gridRows = useMemo(() => filteredRows.map((r) => ({ id: r.id, ...r })), [filteredRows]);

	/* Create Modal handlers */
	const openCreate = () => {
		setC_lr_number("");
		setC_product_name("");
		setC_manufacturer_name("");
		setC_description("");
		setC_status("Open");
		setC_executive("");
		setC_phone("");
		setCreateOpen(true);
	};
	const submitCreate = async () => {
		try {
			const user_id = Number(await getUserId());
			const payload: Omit<LRReceipt, "id"> = {
				lr_number: c_lr_number,
				product_name: c_product_name,
				manufacturer_name: c_manufacturer_name,
				description: c_description,
				status: c_status,
				executive: c_executive,
				phone: c_phone,
				user_id,
			};
			await createLR(payload);
			setCreateOpen(false);
			await loadAll();
			setSnack({ open: true, msg: "LR created", type: "success" });
		} catch (e: any) {
			setSnack({ open: true, msg: e?.message || "Create failed", type: "error" });
		}
	};

	/* Edit Modal handlers */
	const openEdit = (row: LRReceipt) => {
		setEditRow(row);
		setE_lr_number(row.lr_number);
		setE_product_name(row.product_name);
		setE_manufacturer_name(row.manufacturer_name);
		setE_description(row.description);
		setE_status(row.status);
		setE_executive(row.executive);
		setE_phone(row.phone);
		setEditOpen(true);
	};
	const submitEdit = async () => {
		if (!editRow) return;
		try {
			const payload: LRReceipt = {
				id: editRow.id,
				lr_number: e_lr_number,
				product_name: e_product_name,
				manufacturer_name: e_manufacturer_name,
				description: e_description,
				status: e_status,
				executive: e_executive,
				phone: e_phone,
				file_path: editRow.file_path,
				filename: editRow.filename,
				user_id: editRow.user_id,
			};
			await updateLRFull(payload); // full-row update to satisfy stricter backends
			setEditOpen(false);
			setRows((prev) => prev.map((r) => (r.id === payload.id ? { ...payload } : r)));
			setSnack({ open: true, msg: "LR updated", type: "success" });
		} catch (e: any) {
			setSnack({ open: true, msg: e?.message || "Update failed", type: "error" });
		}
	};
	const uploadInEdit = async (file?: File | null) => {
		if (!file || !editRow) return;
		try {
			await uploadLRAttachment(editRow.id, file);
			await loadAll();
			setSnack({ open: true, msg: "File uploaded", type: "success" });
		} catch (err: any) {
			setSnack({ open: true, msg: err?.message || "Upload failed", type: "error" });
		}
	};

	/* Columns */
	const columns: GridColDef[] = [
		{
			field: "lr_number",
			headerName: "LR Number",
			minWidth: 160,
			flex: 1.0,
			renderCell: (p) => (
				<Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
					<DescriptionIcon sx={{ fontSize: 16, mr: 0.75, color: "text.secondary" }} />
					<Typography noWrap fontWeight={700} title={String(p.value ?? "")}>
						{p.value}
					</Typography>
				</Box>
			),
		},
		{
			field: "product_name",
			headerName: "Product",
			minWidth: 180,
			flex: 1.1,
			renderCell: (p) => (
				<Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
					<Inventory2Icon sx={{ fontSize: 16, mr: 0.75, color: "text.secondary" }} />
					<Typography noWrap title={String(p.value ?? "")}>{p.value}</Typography>
				</Box>
			),
		},
		{ field: "manufacturer_name", headerName: "Manufacturer", minWidth: 160, flex: 1.0 },
		{ field: "description", headerName: "Description", minWidth: 200, flex: 1.4 },
		{
			field: "status",
			headerName: "Status",
			minWidth: 140,
			flex: 0.8,
			renderCell: (p) => (
				<Chip
					label={p.value || "-"}
					size="small"
					color={
						p.value === "Closed" ? "success" : p.value === "Pending" ? "warning" : "default"
					}
					sx={{ height: 24, "& .MuiChip-label": { px: 1, fontSize: 12, fontWeight: 700 } }}
				/>
			),
		},
		{ field: "executive", headerName: "Executive", minWidth: 140, flex: 0.9 },
		{ field: "phone", headerName: "Phone", minWidth: 140, flex: 0.9 },
		{
			field: "file_path",
			headerName: "Attachment",
			minWidth: 220,
			flex: 1.1,
			sortable: false,
			filterable: false,
			disableColumnMenu: true,
			renderCell: (p) => {
				const row = p.row as LRReceipt;
				const hasFile = !!row.file_path;
				return (
					<Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
						<Button
							size="small"
							startIcon={<CloudUploadIcon />}
							variant="outlined"
							onClick={(e) => {
								e.stopPropagation();
								openEdit(row); // upload from the edit dialog for consistency
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
								style={{
									display: "inline-block",
									maxWidth: 140,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}
								title={row.filename || row.file_path}
							>
								{row.filename || "View"}
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
				const d = p.row as LRReceipt;
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
			{/* Global top nav (same as Contact / SR) */}
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
				{/* Toolbar like SR: search + New LR + filters */}
				<AppBar position="static" color="transparent" elevation={0} sx={{ flex: "0 0 auto" }}>
					<Toolbar sx={{ minHeight: 56, gap: 1, justifyContent: "space-between" }}>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
							{!lrIdFromQuery && (
								<TextField
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									size="medium"
									placeholder="Search LR receipts..."
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<SearchIcon fontSize="small" />
											</InputAdornment>
										),
									}}
									sx={{ width: { xs: 220, sm: 320, md: 420 } }}
								/>
							)}
						</Box>

						<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<Button variant="contained" onClick={openCreate} sx={{ textTransform: "none", fontWeight: 700 }}>
								New LR
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

			{/* --------------------- Create Modal --------------------- */}
			<Dialog
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				fullWidth
				maxWidth="sm"
				PaperProps={{ sx: { borderRadius: 2 } }}
			>
				<DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<Typography variant="h6">Create LR</Typography>
					<IconButton onClick={() => setCreateOpen(false)} size="small">
						<CloseIcon />
					</IconButton>
				</DialogTitle>
				<DialogContent dividers>
					<Grid container spacing={2}>
						<Grid item xs={12} sm={6}>
							<TextField fullWidth label="LR Number" value={c_lr_number} onChange={(e) => setC_lr_number(e.target.value)} />
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField fullWidth label="Product" value={c_product_name} onChange={(e) => setC_product_name(e.target.value)} />
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField fullWidth label="Manufacturer" value={c_manufacturer_name} onChange={(e) => setC_manufacturer_name(e.target.value)} />
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField select fullWidth label="Status" value={c_status} onChange={(e) => setC_status(e.target.value as any)}>
								<MenuItem value="Open">Open</MenuItem>
								<MenuItem value="Pending">Pending</MenuItem>
								<MenuItem value="Closed">Closed</MenuItem>
							</TextField>
						</Grid>
						<Grid item xs={12}>
							<TextField fullWidth label="Description" value={c_description} onChange={(e) => setC_description(e.target.value)} multiline minRows={3} />
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField fullWidth label="Executive" value={c_executive} onChange={(e) => setC_executive(e.target.value)} />
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField fullWidth label="Phone" value={c_phone} onChange={(e) => setC_phone(e.target.value)} />
						</Grid>
					</Grid>
				</DialogContent>
				<DialogActions>
					<Button variant="outlined" onClick={() => setCreateOpen(false)}>Cancel</Button>
					<Button variant="contained" onClick={submitCreate}>Create</Button>
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
					<Typography variant="h6">Edit LR</Typography>
					<IconButton onClick={() => setEditOpen(false)} size="small">
						<CloseIcon />
					</IconButton>
				</DialogTitle>
				<DialogContent dividers>
					{editRow ? (
						<Grid container spacing={2}>
							<Grid item xs={12} sm={6}>
								<TextField fullWidth label="LR Number" value={e_lr_number} onChange={(e) => setE_lr_number(e.target.value)} />
							</Grid>
							<Grid item xs={12} sm={6}>
								<TextField fullWidth label="Product" value={e_product_name} onChange={(e) => setE_product_name(e.target.value)} />
							</Grid>
							<Grid item xs={12} sm={6}>
								<TextField fullWidth label="Manufacturer" value={e_manufacturer_name} onChange={(e) => setE_manufacturer_name(e.target.value)} />
							</Grid>
							<Grid item xs={12} sm={6}>
								<TextField select fullWidth label="Status" value={e_status} onChange={(e) => setE_status(e.target.value as any)}>
									<MenuItem value="Open">Open</MenuItem>
									<MenuItem value="Pending">Pending</MenuItem>
									<MenuItem value="Closed">Closed</MenuItem>
								</TextField>
							</Grid>
							<Grid item xs={12}>
								<TextField fullWidth label="Description" value={e_description} onChange={(e) => setE_description(e.target.value)} multiline minRows={3} />
							</Grid>
							<Grid item xs={12} sm={6}>
								<TextField fullWidth label="Executive" value={e_executive} onChange={(e) => setE_executive(e.target.value)} />
							</Grid>
							<Grid item xs={12} sm={6}>
								<TextField fullWidth label="Phone" value={e_phone} onChange={(e) => setE_phone(e.target.value)} />
							</Grid>

							{/* Attachment section — mirrors SR behavior */}
							<Grid item xs={12}>
								<Typography variant="subtitle1" gutterBottom>
									Attachment
								</Typography>
								<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
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
										Upload New
									</Button>

									{editRow.file_path ? (
										<a
											href={`/uploads/lr-receipts/${editRow.file_path}`}
											target="_blank"
											rel="noopener noreferrer"
											style={{
												textDecoration: "none",
												color: theme.palette.primary.main,
												fontWeight: 600,
											}}
											title={editRow.filename || editRow.file_path}
										>
											{editRow.filename || "View current file"}
										</a>
									) : (
										<Typography color="text.secondary">No file uploaded yet</Typography>
									)}
								</Box>
							</Grid>
						</Grid>
					) : (
						<Typography>No LR selected</Typography>
					)}
				</DialogContent>
				<DialogActions>
					<Button variant="outlined" onClick={() => setEditOpen(false)}>Cancel</Button>
					<Button variant="contained" onClick={submitEdit} disabled={!editRow}>Save</Button>
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
