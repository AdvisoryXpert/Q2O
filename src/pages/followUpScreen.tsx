// src/pages/followUpScreen.tsx
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
	MenuItem,
	Paper,
	Snackbar,
	Alert,
	Tab,
	Tabs,
	TextField,
	Toolbar,
	Tooltip,
	Typography,
	ToggleButton,
	ToggleButtonGroup,
	useMediaQuery,
	useTheme,
	Divider,
	Autocomplete,
} from "@mui/material";
import { DataGrid, GridColDef, GridRowModel, GridToolbar } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import InfoIcon from "@mui/icons-material/Info";
import { http } from "../lib/http";
import { useNavigate } from "react-router-dom";

/** ---------- Types & constants ---------- */
type FollowUpStatus = "Pending" | "In Progress" | "Completed";
const STATUS_OPTIONS: FollowUpStatus[] = ["Pending", "In Progress", "Completed"];

type FollowUp = {
  followup_id: string;
  entity_type: "order" | "quote" | "sr" | "lr";
  entity_id: string;
  invoice_id?: string;
  lr_number?: string;
  assigned_to: number;
  created_by: number;
  status: FollowUpStatus;
  due_date: string | null;
  notes: string | null;
};

type StatusFilter = "all" | FollowUpStatus;

type User = { id: number; name: string; email?: string };

/** ---------- Helpers ---------- */
const safeDate = (d?: string | null) => {
	if (!d) return "-";
	const t = Date.parse(d);
	if (Number.isNaN(t)) return "-";
	return new Date(t).toLocaleString();
};
const isOverdue = (d?: string | null, status?: FollowUpStatus) => {
	if (!d || status === "Completed") return false;
	const t = Date.parse(d);
	return !Number.isNaN(t) && t < Date.now();
};

// For <TextField type="datetime-local">
const toLocalDatetimeValue = (iso?: string | null) => {
	if (!iso) return "";
	const d = new Date(iso);
	if (isNaN(d.getTime())) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
		d.getMinutes()
	)}`;
};
const fromLocalDatetimeValue = (val: string) => {
	if (!val) return null;
	const t = Date.parse(val);
	if (Number.isNaN(t)) return null;
	return new Date(t).toISOString();
};

/** Role/User from /me → localStorage; abort if role missing (no synthetic default) */
async function getUserContext(): Promise<{ role: string; userId: string }> {
	let role = "",
		userId = "";
	try {
		const resp = await http.get("/me");
		const me = resp?.data ?? {};
		role = me.role ?? me.userRole ?? me?.user?.role ?? me?.user?.userRole ?? "";
		userId = me.id ?? me.user_id ?? me?.user?.id ?? me?.user?.user_id ?? "";
	} catch {
		// ignore; fall back to localStorage
	}
	if (!role) role = localStorage.getItem("userRole") ?? "";
	if (!userId) userId = localStorage.getItem("user_id") ?? "";
	if (!role) throw new Error("User role is missing; cannot fetch follow-ups.");
	return { role, userId };
}

/** ---------- API helpers ---------- */
async function fetchFollowUps(): Promise<FollowUp[]> {
	const { role, userId } = await getUserContext();
	let url = `/followups?userRole=${encodeURIComponent(role)}`;
	if (role.toLowerCase() === "employee" && userId) url += `&userId=${encodeURIComponent(userId)}`;
	const { data } = await http.get(url);
	return data ?? [];
}

// FIXED: no mixing of ?? and || without parens
function normalizeUsers(raw: any[]): User[] {
	return (Array.isArray(raw) ? raw : [])
		.map((u: any) => {
			const id = u?.id ?? u?.user_id ?? u?.employee_id ?? u?.uid ?? u?.empId ?? null;

			const nameFromParts = [u?.first_name, u?.last_name].filter(Boolean).join(" ");
			const nameFromEmail = u?.email ? String(u.email).split("@")[0] : undefined;
			const primaryName = u?.name ?? u?.full_name ?? u?.display_name ?? undefined;
			const secondaryName = nameFromParts || u?.username || nameFromEmail;
			const name = (primaryName ?? secondaryName) ?? String(id ?? "");

			return id == null ? null : ({ id: Number(id), name: String(name), email: u?.email });
		})
		.filter(Boolean) as User[];
}

async function fetchUsers(): Promise<User[]> {
	const { data } = await http.get("/followups/users");
	return normalizeUsers(data ?? []);
}

async function updateFollowUp(id: string, patch: Partial<FollowUp>) {
	await http.put(`/followups/${id}`, patch);
}

/** ---------- MUI X v8-safe helpers ---------- */
const getRowArg = (args: any[]) =>
  (args[1] ??
    (args[0] && typeof args[0] === "object" && "row" in args[0] ? (args[0] as any).row : undefined)) as
    | FollowUp
    | undefined;
const getValueArg = (args: any[]) =>
	args[0] && typeof args[0] === "object" && "value" in args[0] ? (args[0] as any).value : args[0];

/** ========================================================== */
export default function FollowUpScreen() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const navigate = useNavigate();

	const [rows, setRows] = useState<FollowUp[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const userMap = useMemo(() => {
		const m = new Map<number, User>();
		users.forEach((u) => m.set(u.id, u));
		return m;
	}, [users]);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

	// details dialog
	const [detailOpen, setDetailOpen] = useState(false);
	const [activeTab, setActiveTab] = useState(0);
	const [selected, setSelected] = useState<FollowUp | null>(null);

	// EDIT dialog (Contact-style)
	const [formOpen, setFormOpen] = useState(false);
	const [formSaving, setFormSaving] = useState(false);
	const [form, setForm] = useState<{
    followup_id?: string;
    status: FollowUpStatus;
    assigned_to: string; // store as string; normalize to number on save
    due_date: string; // datetime-local value
    notes: string;
  }>({ status: "Pending", assigned_to: "", due_date: "", notes: "" });

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
				const [list, userList] = await Promise.all([fetchFollowUps(), fetchUsers()]);
				setRows(list);
				setUsers(userList);
				setError(null);
			} catch (e: any) {
				setError(e?.message || "Failed to load follow-ups.");
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	/** Search + filter */
	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		let list = rows;
		if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
		const out = q
			? list.filter((d) =>
				[
					d.followup_id,
					d.entity_type,
					d.entity_id,
					d.status,
					d.notes,
					userMap.get(d.created_by)?.name,
					userMap.get(d.assigned_to)?.name,
				]
					.filter(Boolean)
					.some((v) => String(v).toLowerCase().includes(q))
			)
			: list;
		return out;
	}, [rows, search, statusFilter, userMap]);

	const gridRows = useMemo(() => filtered.map((d) => ({ id: d.followup_id, ...d })), [filtered]);

	/** DETAILS */
	const openDetails = (d: FollowUp) => {
		setSelected(d);
		setActiveTab(0);
		setDetailOpen(true);
	};

	/** EDIT dialog */
	const openEdit = (d: FollowUp) => {
		setForm({
			followup_id: d.followup_id,
			status: d.status,
			assigned_to: d.assigned_to != null ? String(d.assigned_to) : "",
			due_date: toLocalDatetimeValue(d.due_date),
			notes: d.notes ?? "",
		});
		setFormOpen(true);
	};

	const saveForm = async () => {
		if (!form.followup_id) return;
		if (!STATUS_OPTIONS.includes(form.status)) {
			setSnack({ open: true, msg: "Status must be Pending / In Progress / Completed.", type: "error" });
			return;
		}
		let assignedNum: number | undefined = undefined;
		if (form.assigned_to !== "") {
			const n = parseInt(form.assigned_to, 10);
			if (Number.isNaN(n)) {
				setSnack({ open: true, msg: "Assigned To must be a valid user.", type: "error" });
				return;
			}
			assignedNum = n;
		}
		const patch: Partial<FollowUp> = {
			status: form.status,
			assigned_to: assignedNum as any,
			due_date: fromLocalDatetimeValue(form.due_date),
			notes: form.notes?.trim() ?? null,
		};

		setFormSaving(true);
		try {
			await updateFollowUp(form.followup_id, patch);
			setRows((prev) => prev.map((r) => (r.followup_id === form.followup_id ? { ...r, ...patch } : r)));
			setSnack({ open: true, msg: "Follow-up updated", type: "success" });
			setFormOpen(false);
		} catch (e: any) {
			setSnack({ open: true, msg: e?.response?.data?.message || "Update failed", type: "error" });
		} finally {
			setFormSaving(false);
		}
	};

	/** Inline row edit still supported */
	const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
		const id = String(newRow.followup_id);
		const patch: Partial<FollowUp> = {};
		(["assigned_to", "status", "due_date", "notes"] as const).forEach((k) => {
			if (newRow[k] !== oldRow[k]) (patch as any)[k] = newRow[k];
		});

		if (patch.status && !STATUS_OPTIONS.includes(patch.status as FollowUpStatus)) {
			setSnack({ open: true, msg: "Status must be Pending / In Progress / Completed.", type: "error" });
			return oldRow;
		}
		if (patch.assigned_to != null && typeof patch.assigned_to === "string") {
			const n = parseInt(patch.assigned_to as any, 10);
			if (!Number.isNaN(n)) (patch as any).assigned_to = n;
		}

		if (Object.keys(patch).length) {
			await updateFollowUp(id, patch);
			setRows((prev) => prev.map((r) => (r.followup_id === id ? { ...r, ...patch } : r)));
		}
		return newRow;
	};

	/** Columns (with user names and dropdown for Assigned To) */
	const assignedValueOptions = useMemo(
		() => users.map((u) => ({ value: u.id, label: u.name })),
		[users]
	);

	const columns: GridColDef[] = [
		{
			field: "followup_id",
			headerName: "Follow-Up",
			flex: 0.9,
			minWidth: 140,
			renderCell: ((...args: any[]) => {
				const row = getRowArg(args)!;
				const { entity_type, entity_id } = row;
				let path = "";
				if (entity_type === "quote") path = `/quotation-items/${entity_id}`;
				else if (entity_type === "sr") path = `/serviceRequest/${entity_id}`;
				else if (entity_type === "lr") path = `/lr-item?id=${entity_id}`;
				else if (entity_type === "order") path = `/orders/${entity_id}`;
				return (
					<Button size="small" onClick={() => path && navigate(path)}>
						{row.followup_id}
					</Button>
				);
			}) as any,
		},
		{
			field: "entity_type",
			headerName: "Entity",
			flex: 0.7,
			minWidth: 120,
			renderCell: ((...args: any[]) => {
				const value = String(getValueArg(args) ?? "-");
				const color =
          value === "quote" ? "info" : value === "order" ? "primary" : value === "sr" ? "secondary" : "default";
				return (
					<Chip
						label={value.toUpperCase()}
						size="small"
						color={color as any}
						variant="outlined"
						sx={{ fontWeight: 700 }}
					/>
				);
			}) as any,
		},
		{ field: "entity_id", headerName: "Entity ID", flex: 0.7, minWidth: 120 },

		{
			field: "created_by",
			headerName: "Created By",
			flex: 0.9,
			minWidth: 150,
			renderCell: ((...args: any[]) => {
				const row = getRowArg(args)!;
				const u = userMap.get(row.created_by);
				return (
					<Typography variant="body2" title={u?.email || String(row.created_by)}>
						{u?.name ?? row.created_by ?? "-"}
					</Typography>
				);
			}) as any,
		},

		{
			field: "assigned_to",
			headerName: "Assigned To",
			flex: 1.0,
			minWidth: 180,
			editable: true,
			type: "singleSelect",
			valueOptions: assignedValueOptions,
			renderCell: ((...args: any[]) => {
				const row = getRowArg(args)!;
				const u = userMap.get(row.assigned_to);
				return (
					<Typography variant="body2" title={u?.email || String(row.assigned_to)}>
						{u?.name ?? row.assigned_to ?? "-"}
					</Typography>
				);
			}) as any,
		},

		{
			field: "status",
			headerName: "Status",
			flex: 0.9,
			minWidth: 160,
			editable: true,
			type: "singleSelect",
			valueOptions: STATUS_OPTIONS,
			renderCell: ((...args: any[]) => {
				const value = String(getValueArg(args) ?? "");
				const color = value === "Completed" ? "success" : value === "Pending" ? "warning" : "info";
				const icon =
          value === "Completed" ? <AssignmentTurnedInIcon /> : value === "Pending" ? <PendingActionsIcon /> : <InfoIcon />;
				return (
					<Chip
						icon={icon}
						label={value || "-"}
						size="small"
						color={color as any}
						variant="filled"
						sx={{ "& .MuiChip-label": { px: 1, fontSize: 12, fontWeight: 700 } }}
					/>
				);
			}) as any,
		},

		{
			field: "due_date",
			headerName: "Due",
			flex: 0.8,
			minWidth: 160,
			editable: true,
			valueFormatter: ((...args: any[]) => {
				const value = getValueArg(args) as string | null | undefined;
				return safeDate(value ?? null);
			}) as any,
			renderCell: ((...args: any[]) => {
				const row = getRowArg(args);
				const value = getValueArg(args) as string | null | undefined;
				const overdue = isOverdue(value ?? null, row?.status);
				if (!value) return "-";
				return (
					<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
						{overdue && <EventBusyIcon fontSize="small" color="error" />}
						<Typography variant="body2" color={overdue ? "error.main" : "text.primary"}>
							{safeDate(value)}
						</Typography>
					</Box>
				);
			}) as any,
		},

		{
			field: "notes",
			headerName: "Notes",
			flex: 1.2,
			minWidth: 240,
			editable: true,
			renderCell: ((...args: any[]) => {
				const value = String(getValueArg(args) ?? "");
				return (
					<Typography variant="body2" noWrap title={value} sx={{ maxWidth: "100%", color: "text.secondary" }}>
						{value || "—"}
					</Typography>
				);
			}) as any,
		},

		{
			field: "actions",
			headerName: "Actions",
			sortable: false,
			filterable: false,
			disableColumnMenu: true,
			minWidth: 160,
			flex: 0.9,
			renderCell: ((...args: any[]) => {
				const row = getRowArg(args)!;
				return (
					<Box sx={{ display: "flex", gap: 0.5 }}>
						<Tooltip title="View">
							<IconButton size="small" color="primary" onClick={() => openDetails(row)}>
								<VisibilityIcon fontSize="small" />
							</IconButton>
						</Tooltip>
						<Tooltip title="Edit">
							<IconButton size="small" onClick={() => openEdit(row)}>
								<EditIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					</Box>
				);
			}) as any,
		},
	];

	/** ---------- Render ---------- */
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
							<Typography variant="h6" fontWeight={800} sx={{ mr: 1 }}>
								Follow-ups
							</Typography>
							<TextField
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								size="medium"
								placeholder="Search follow-ups…"
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

						<Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
							<ToggleButtonGroup
								size="small"
								color="primary"
								value={statusFilter}
								exclusive
								onChange={(_, v) => v && setStatusFilter(v)}
							>
								<ToggleButton value="all">All</ToggleButton>
								<ToggleButton value="Pending">Pending</ToggleButton>
								<ToggleButton value="In Progress">In&nbsp;Progress</ToggleButton>
								<ToggleButton value="Completed">Completed</ToggleButton>
							</ToggleButtonGroup>

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
						</Box>
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
							onProcessRowUpdateError={(err) => console.error("[FollowUps] processRowUpdate error", err)}
							disableColumnMenu
							rowSelection={false}
							hideFooter
							slots={{ toolbar: GridToolbar }}
							slotProps={{ toolbar: { showQuickFilter: false } }}
							columnHeaderHeight={52}
							rowHeight={56}
							onRowDoubleClick={(p) => openEdit(p.row as FollowUp)}
							getRowClassName={(params) =>
								isOverdue(params.row.due_date, params.row.status) ? "row-overdue" : ""
							}
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
								"& .row-overdue": {
									background:
                    "linear-gradient(90deg, rgba(255,0,0,0.05) 0%, rgba(255,0,0,0.02) 100%)",
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
								{filtered.map((d) => {
									const overdue = isOverdue(d.due_date, d.status);
									const createdName = userMap.get(d.created_by)?.name ?? d.created_by;
									const assignedName = userMap.get(d.assigned_to)?.name ?? d.assigned_to;
									return (
										<Grid item xs={12} key={d.followup_id}>
											<Card
												variant="outlined"
												sx={{
													borderRadius: 2,
													...(overdue && {
														background:
                              "linear-gradient(90deg, rgba(255,0,0,0.05) 0%, rgba(255,0,0,0.02) 100%)",
													}),
												}}
											>
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
																{d.entity_type.toUpperCase()} · {d.entity_id}
															</Typography>
														</Box>
														<Chip
															size="small"
															label={d.status}
															color={
																d.status === "Completed" ? "success" : d.status === "Pending" ? "warning" : "info"
															}
															variant="filled"
															sx={{ fontWeight: 700 }}
														/>
													</Box>

													<Grid container spacing={1}>
														<Grid item xs={6}>
															<Typography variant="caption" color="text.secondary">
																Created By
															</Typography>
															<Typography variant="body2">{createdName}</Typography>
														</Grid>
														<Grid item xs={6}>
															<Typography variant="caption" color="text.secondary">
																Assigned To
															</Typography>
															<Typography variant="body2">{assignedName}</Typography>
														</Grid>
														<Grid item xs={6}>
															<Typography variant="caption" color="text.secondary">
																Due
															</Typography>
															<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
																{overdue && <EventBusyIcon fontSize="small" color="error" />}
																<Typography variant="body2" color={overdue ? "error.main" : "text.primary"}>
																	{safeDate(d.due_date)}
																</Typography>
															</Box>
														</Grid>
														<Grid item xs={12}>
															<Typography variant="caption" color="text.secondary">
																Notes
															</Typography>
															<Typography variant="body2" sx={{ color: "text.secondary" }}>
																{d.notes ?? "—"}
															</Typography>
														</Grid>
													</Grid>

													<Box sx={{ mt: 1.25, display: "flex", gap: 0.75, justifyContent: "flex-end" }}>
														<Button
															size="small"
															variant="outlined"
															startIcon={<VisibilityIcon fontSize="small" />}
															onClick={() => openDetails(d)}
														>
															View
														</Button>
														<Button
															size="small"
															variant="contained"
															startIcon={<EditIcon fontSize="small" />}
															onClick={() => openEdit(d)}
														>
															Edit
														</Button>
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

			{/* DETAILS dialog */}
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
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Follow-Up
										</Typography>
										<Typography variant="body2">{selected.followup_id}</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Status
										</Typography>
										<Chip
											size="small"
											label={selected.status}
											color={selected.status === "Completed" ? "success" : selected.status === "Pending" ? "warning" : "info"}
											variant="filled"
											sx={{ fontWeight: 700 }}
										/>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Entity
										</Typography>
										<Typography variant="body2">
											{selected.entity_type.toUpperCase()} · {selected.entity_id}
										</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Due
										</Typography>
										<Typography variant="body2">{safeDate(selected.due_date)}</Typography>
									</Grid>
									<Grid item xs={12}>
										<Divider sx={{ my: 1 }} />
									</Grid>
									<Grid item xs={12}>
										<Typography variant="caption" color="text.secondary">
											Notes
										</Typography>
										<Typography variant="body2" sx={{ color: "text.secondary" }}>
											{selected.notes ?? "—"}
										</Typography>
									</Grid>
								</Grid>
							)}

							{activeTab === 1 && (
								<Grid container spacing={2}>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Created By
										</Typography>
										<Typography variant="body2">
											{userMap.get(selected.created_by)?.name ?? selected.created_by}
										</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Assigned To
										</Typography>
										<Typography variant="body2">
											{userMap.get(selected.assigned_to)?.name ?? selected.assigned_to}
										</Typography>
									</Grid>
									{selected.lr_number && (
										<Grid item xs={12} sm={6}>
											<Typography variant="caption" color="text.secondary">
												LR Number
											</Typography>
											<Typography variant="body2">{selected.lr_number}</Typography>
										</Grid>
									)}
									{selected.invoice_id && (
										<Grid item xs={12} sm={6}>
											<Typography variant="caption" color="text.secondary">
												Invoice ID
											</Typography>
											<Typography variant="body2">{selected.invoice_id}</Typography>
										</Grid>
									)}
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

			{/* EDIT dialog (Contact-style) */}
			<Dialog
				open={formOpen}
				onClose={() => setFormOpen(false)}
				fullWidth
				fullScreen={isMobile}
				maxWidth="md"
				PaperProps={{ sx: { borderRadius: 2 } }}
			>
				<DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<Typography variant="h6">Edit Follow-Up</Typography>
					<IconButton onClick={() => setFormOpen(false)} size="small">
						<CloseIcon />
					</IconButton>
				</DialogTitle>
				<DialogContent dividers>
					<Grid container spacing={2}>
						<Grid item xs={12} sm={6}>
							<TextField
								select
								fullWidth
								label="Status"
								value={form.status}
								onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FollowUpStatus }))}
							>
								{STATUS_OPTIONS.map((s) => (
									<MenuItem key={s} value={s}>
										{s}
									</MenuItem>
								))}
							</TextField>
						</Grid>

						{/* Assigned To dropdown with typed search */}
						<Grid item xs={12} sm={6}>
							<Autocomplete<User>
								options={users}
								value={users.find((u) => String(u.id) === String(form.assigned_to)) || null}
								onChange={(_, val) => setForm((f) => ({ ...f, assigned_to: val ? String(val.id) : "" }))}
								getOptionLabel={(o) => o?.name ?? ""}
								renderInput={(params) => <TextField {...params} label="Assigned To" placeholder="Search user…" />}
								isOptionEqualToValue={(opt, val) => opt.id === val.id}
								clearOnBlur
							/>
						</Grid>

						<Grid item xs={12} sm={6}>
							<TextField
								type="datetime-local"
								fullWidth
								label="Due Date"
								value={form.due_date}
								onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
								InputLabelProps={{ shrink: true }}
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Notes"
								value={form.notes}
								onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
								multiline
								minRows={3}
							/>
						</Grid>
					</Grid>

					{form.followup_id && (
						<>
							<Divider sx={{ my: 2 }} />
							<Grid container spacing={2}>
								<Grid item xs={12} sm={6}>
									<TextField fullWidth label="Follow-up ID" value={form.followup_id} InputProps={{ readOnly: true }} />
								</Grid>
							</Grid>
						</>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setFormOpen(false)} variant="outlined" disabled={formSaving}>
						Cancel
					</Button>
					<Button onClick={saveForm} variant="contained" disabled={formSaving}>
						{formSaving ? "Saving..." : "Save"}
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
