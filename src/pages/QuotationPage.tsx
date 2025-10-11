import { useEffect, useMemo, useState } from "react";
import {
	AppBar,
	Avatar,
	Box,
	Card,
	CardContent,
	Chip,
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
	TablePagination,
	Autocomplete,
} from "@mui/material";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import FilterListIcon from "@mui/icons-material/FilterList";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import DraftsIcon from "@mui/icons-material/Drafts";
import SendIcon from "@mui/icons-material/Send";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { http } from "../lib/http";
import { useNavigate } from "react-router-dom";

/* ---------------- utilities (safe formatting) ---------------- */
function safeDate(d?: string | null) {
	if (!d) return "-";
	const t = Date.parse(d);
	if (Number.isNaN(t)) return "-";
	return new Date(t).toLocaleString();
}

function toINR(n?: number | null) {
	if (typeof n !== "number" || Number.isNaN(n)) return "₹0";
	return n.toLocaleString("en-IN", {
		style: "currency",
		currency: "INR",
		maximumFractionDigits: 0,
	});
}

/* ---------------- types ---------------- */
	type Quote = {
	  quote_id: number;
	  dealer_id?: number | string | null;
	  dealer_name?: string | null;
	  date_created?: string | null;
	  total_price?: number | null;
	  status?: string | null;
	  assigned_kam_name?: string | null;
	};
type Props = {
  dealerId?: number | string | null;
  limit?: number;
};

type User = {
  user_id: string | number;
  full_name: string;
};

async function fetchKams(): Promise<User[]> {
	const { data } = await http.get("/followups/users");
	return data ?? [];
}

/* ---------------- api helpers ---------------- */
async function fetchQuotes(limit?: number): Promise<Quote[]> {
	try {
		const r = await http.get(`/quotes-raw${limit ? `?limit=${limit}` : ""}`);
		return (r?.data ?? []) as Quote[];
	} catch {
		return [];
	}
}

async function deleteQuote(id: number) {
	await http.delete(`/quotestoorder/${id}`);
}

/* Small helpers to be compatible with both MUI X APIs */
const getRowArg = (args: any[]) =>
  (args[1] /* new API: (value, row) */
    ?? (args[0] && typeof args[0] === "object" && "row" in args[0] ? (args[0] as any).row : undefined) /* old API: (params) */
  ) as Quote | undefined;
const getValueArg = (args: any[]) =>
	(args[0] && typeof args[0] === "object" && "value" in args[0] ? (args[0] as any).value : args[0]); // old vs new

const renderStatusChip = (status: string | null | undefined) => {
	const s = String(status ?? "").toLowerCase();

	if (s.includes("accept") || s === "approved") {
		return (
			<Chip
				icon={<CheckCircleIcon />}
				label="Accepted"
				color="success"
				variant="outlined"
				size="small"
				sx={{ fontWeight: 700 }}
			/>
		);
	}
	if (s.includes("reject") || s === "cancelled" || s === "canceled") {
		return (
			<Chip
				icon={<CancelIcon />}
				label="Rejected"
				color="error"
				variant="outlined"
				size="small"
				sx={{ fontWeight: 700 }}
			/>
		);
	}
	if (s.includes("sent")) {
		return (
			<Chip
				icon={<SendIcon />}
				label="Sent"
				color="warning"
				variant="outlined"
				size="small"
				sx={{ fontWeight: 700 }}
			/>
		);
	}
	if (s.includes("finalized")) {
		return (
			<Chip
				icon={<CheckCircleIcon />}
				label="Finalized"
				color="primary"
				variant="outlined"
				size="small"
				sx={{ fontWeight: 700 }}
			/>
		);
	}
	return (
		<Chip
			icon={<DraftsIcon />}
			label="Draft"
			color="warning"
			variant="outlined"
			size="small"
			sx={{ fontWeight: 700 }}
		/>
	);
};

/* ============================================================ */
export default function QuotationPage({ dealerId, limit }: Props) {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const navigate = useNavigate();

	const [quotes, setQuotes] = useState<Quote[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [selectedKam, setSelectedKam] = useState<string | null>(null);
	const [kamOptions, setKamOptions] = useState<string[]>([]);
	const [paginationModel, setPaginationModel] = useState({
		page: 0,
		pageSize: 50,
	});

	useEffect(() => {
		(async () => {
			try {
				const kams = await fetchKams();
				setKamOptions(kams.map(k => k.full_name));
			} catch {
				// ignore; dropdown will be empty
			}
		})();
	}, []);

	useEffect(() => {
		(async () => {
			try {
				setLoading(true);
				setError(null);

				const data = await fetchQuotes(limit);
				const quotesByDealer =
          dealerId == null
          	? data
          	: data.filter((q) => String(q.dealer_id ?? "") === String(dealerId ?? ""));

				const sortedQuotes = [...quotesByDealer].sort((a, b) => {
					const da = a?.date_created ? Date.parse(a.date_created) : NaN;
					const db = b?.date_created ? Date.parse(b.date_created) : NaN;
					if (!Number.isNaN(db) && !Number.isNaN(da)) return db - da;
					return (b?.quote_id ?? 0) - (a?.quote_id ?? 0);
				});

				setQuotes(limit ? sortedQuotes.slice(0, limit) : sortedQuotes);
			} catch {
				setError("Failed to load quotations.");
			} finally {
				setLoading(false);
			}
		})();
	}, [dealerId, limit]);

	/* ---------------- search ---------------- */
	const filteredQuotes = useMemo(() => {
		const q = search.trim().toLowerCase();
		let filtered = quotes;

		if (selectedKam) {
			filtered = filtered.filter(q => q.assigned_kam_name === selectedKam);
		}

		if (!q) return filtered;

		return filtered.filter((d) =>
			[d.quote_id, d.dealer_id, d.dealer_name, d.status, safeDate(d.date_created), toINR(d.total_price)]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q))
		);
	}, [quotes, search, selectedKam]);

	const paginatedQuotes = useMemo(() => {
		const { page, pageSize } = paginationModel;
		const start = page * pageSize;
		const end = start + pageSize;
		return filteredQuotes.slice(start, end);
	}, [filteredQuotes, paginationModel]);

	/* ---------------- actions ---------------- */
	const handleDelete = async (d: Quote) => {
		if (window.confirm(`Delete Quotation "${d.quote_id}"?`)) {
			try {
				await deleteQuote(d.quote_id);
				setQuotes((prev) => prev.filter((r) => r.quote_id !== d.quote_id));
			} catch {
				window.alert("Failed to delete quotation. Please try again.");
			}
		}
	};

	/* ---------------- grid columns (v8-safe) ---------------- */
	const columns: GridColDef[] = [
		{ field: "quote_id", headerName: "Quote ID", flex: 0.7, minWidth: 120 },
		{
			field: "dealer",
			headerName: "Dealer",
			flex: 1,
			minWidth: 160,
			// new API: (value, row), old API: (params)
			valueGetter: ((...args: any[]) => {
				const row = getRowArg(args);
				return row?.dealer_name ?? row?.dealer_id ?? "-";
			}) as any,
		},
		{
			field: "date_created",
			headerName: "Date Created",
			flex: 1,
			minWidth: 180,
			valueFormatter: ((...args: any[]) => {
				const value = getValueArg(args) as string | null | undefined;
				return safeDate(value ?? null);
			}) as any,
		},
		{
			field: "total_price",
			headerName: "Total Price",
			flex: 0.8,
			minWidth: 140,
			valueFormatter: ((...args: any[]) => {
				const value = getValueArg(args) as number | null | undefined;
				return toINR(value ?? null);
			}) as any,
		},
		{
			field: "assigned_kam_name",
			headerName: "KAM",
			flex: 1,
			minWidth: 160,
		},
		{
			field: "status",
			headerName: "Status",
			flex: 0.8,
			minWidth: 120,
			renderCell: ((...args: any[]) => {
				const value = getValueArg(args);
				const row = getRowArg(args);
				return renderStatusChip(value ?? row?.status);
			}) as any,
		},
		{
			field: "actions",
			headerName: "Actions",
			sortable: false,
			filterable: false,
			disableColumnMenu: true,
			minWidth: 140,
			flex: 0.9,
			renderCell: ((...args: any[]) => {
				const row = getRowArg(args)!;
				return (
					<Box sx={{ display: "flex", gap: 0.5 }}>
						<Tooltip title="View">
							<IconButton size="small" onClick={() => navigate(`/quotation-items/${row.quote_id}`)}>
								<VisibilityIcon fontSize="small" />
							</IconButton>
						</Tooltip>
						<Tooltip title="Delete">
							<IconButton size="small" color="error" onClick={() => handleDelete(row)}>
								<DeleteIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					</Box>
				);
			}) as any,
		},
	];

	const gridQuotes = useMemo(() => paginatedQuotes.map((d) => ({ id: d.quote_id, ...d })), [paginatedQuotes]);

	/* ---------------- render ---------------- */
	return (
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
					<TextField
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						size="medium"
						placeholder="Search quotes…"
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon fontSize="small" />
								</InputAdornment>
							),
						}}
						sx={{ width: { xs: 220, sm: 360, md: 480 } }}
					/>
					<Autocomplete
						size="small"
						options={["All KAMs", ...kamOptions]}
						value={selectedKam ?? "All KAMs"}
						onChange={(_e, val) => setSelectedKam(val && val !== "All KAMs" ? val : null)}
						renderInput={(params) => <TextField {...params} label="Filter by KAM" />}
					/>

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
						rows={gridQuotes}
						loading={loading}
						disableColumnMenu
						rowSelection={false}
						pagination
						paginationModel={paginationModel}
						onPaginationModelChange={setPaginationModel}
						pageSizeOptions={[20, 50, 100]}
						rowCount={filteredQuotes.length}
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
						autoHeight={gridQuotes.length <= 14}
					/>
				) : (
					<>
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
								{paginatedQuotes.map((d) => (
									<Grid item xs={12} key={d.quote_id}>
										<Card variant="outlined" sx={{ borderRadius: 2 }}>
											<CardContent sx={{ py: 1.25 }}>
												<Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
													<Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: "primary.main" }}>
														{d.quote_id.toString()?.[0] ?? "?"}
													</Avatar>
													<Box sx={{ minWidth: 0, flex: 1 }}>
														<Typography fontWeight={700} noWrap title={d.quote_id.toString()}>
															{d.quote_id}
														</Typography>
														<Typography variant="caption" color="text.secondary" noWrap>
															{d.dealer_name ?? d.dealer_id ?? "-"}
														</Typography>
													</Box>
													{renderStatusChip(d.status)}
												</Box>

												<Grid container spacing={1}>
													<Grid item xs={6}>
														<Typography variant="caption" color="text.secondary">
															Date
														</Typography>
														<Typography variant="body2">{safeDate(d.date_created)}</Typography>
													</Grid>
													<Grid item xs={6}>
														<Typography variant="caption" color="text.secondary">
															Total
														</Typography>
														<Typography variant="body2">{toINR(d.total_price)}</Typography>
													</Grid>
												</Grid>

												<Box sx={{ mt: 1, display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
													<Tooltip title="View">
														<IconButton
															size="small"
															onClick={() => navigate(`/quotation-items/${d.quote_id}`)}
														>
															<VisibilityIcon fontSize="small" />
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
						<TablePagination
							component="div"
							count={filteredQuotes.length}
							page={paginationModel.page}
							onPageChange={(e, newPage) => setPaginationModel(prev => ({ ...prev, page: newPage }))}
							rowsPerPage={paginationModel.pageSize}
							onRowsPerPageChange={(e) => setPaginationModel(prev => ({ ...prev, pageSize: parseInt(e.target.value, 10), page: 0 }))}
							rowsPerPageOptions={[20, 50, 100]}
						/>
					</>
				)}
			</Box>
		</Paper>
	);
}
