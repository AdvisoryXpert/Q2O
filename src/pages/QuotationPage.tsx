import { useEffect, useMemo, useState } from "react";
import {
	AppBar,
	Avatar,
	Box,
	Button,
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
} from "@mui/material";
import {
	DataGrid,
	GridColDef,
	GridToolbar,
} from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import { http } from "../lib/http";
import { useNavigate } from "react-router-dom";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DraftsIcon from '@mui/icons-material/Drafts';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';

/** Types */
type Quote = {
  quote_id: number;
  user_id: number;
  dealer_id: number | null;
  total_price: number;
  date_created: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
};

/** API helpers */
async function fetchQuotes(dealerId?: number | string | null, limit?: number): Promise<Quote[]> {
	let path = dealerId
		? `/quotestoorder/quotes_by_dealer/${dealerId}`
		: `/quotestoorder/quotes_dtls`;
	if (limit) {
		path += `?limit=${limit}`;
	}
	const { data } = await http.get(path);
	return data ?? [];
}async function deleteQuote(id: number) {
	await http.delete(`/quotestoorder/${id}`);
}

type Props = {
  dealerId?: number | string | null;
  limit?: number;
};

export default function QuotationPage({ dealerId, limit }: Props) {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const navigate = useNavigate();

	const [rows, setRows] = useState<Quote[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");

	useEffect(() => {
		(async () => {
			try {
				setLoading(true);
				setRows(await fetchQuotes(dealerId, limit));
				setError(null);
			} catch {
				setError("Failed to load quotations.");
			} finally {
				setLoading(false);
			}
		})();
	}, [dealerId]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((d) =>
			[d.quote_id, d.dealer_id, d.status]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q))
		);
	}, [rows, search]);

	const handleDelete = async (d: Quote) => {
		if (window.confirm(`Delete Quotation "${d.quote_id}"?`)) {
			try {
				await deleteQuote(d.quote_id);
				setRows((prev) => prev.filter((r) => r.quote_id !== d.quote_id));
			} catch {
				window.alert("Failed to delete Quotation. Please try again.");
			}
		}
	};

	/** DataGrid columns (desktop) */
	const columns: GridColDef[] = [
		{
			field: "quote_id",
			headerName: "Quote ID",
			flex: 1,
			minWidth: 150,
		},
		{
			field: "dealer_id",
			headerName: "Dealer ID",
			flex: 1,
			minWidth: 150,
		},
		{
			field: "date_created",
			headerName: "Date Created",
			flex: 1,
			minWidth: 150,
			valueFormatter: (params) => new Date(params.value as string).toLocaleDateString(),
		},
		{
			field: "total_price",
			headerName: "Total Price",
			flex: 1,
			minWidth: 150,
			valueFormatter: (params) => `₹${Number(params.value).toFixed(2)}`,
		},
		{
			field: "status",
			headerName: "Status",
			flex: 1,
			minWidth: 120,
			renderCell: (p) => {
				const status = p.value as Quote['status'];
				switch (status) {
				case 'accepted':
					return <Chip icon={<CheckCircleIcon />} label="Accepted" color="success" variant="outlined" size="small" />;
				case 'rejected':
					return <Chip icon={<CancelIcon />} label="Rejected" color="error" variant="outlined" size="small" />;
				case 'sent':
					return <Chip icon={<SendIcon />} label="Sent" color="warning" variant="outlined" size="small" />;
				default:
					return <Chip icon={<DraftsIcon />} label="Draft" color="warning" variant="outlined" size="small" />;
				}
			}
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
				const d = p.row as Quote;
				return (
					<Box sx={{ display: "flex", gap: 0.5 }}>
						<Tooltip title="View">
							<IconButton size="small" onClick={() => navigate(`/quotation-items/${d.quote_id}`)}>
								<VisibilityIcon fontSize="small" />
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

	const gridRows = useMemo(() => filtered.map((d) => ({ id: d.quote_id, ...d })), [filtered]);

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
								onClick={() => navigate('/quotation-from-cart')}
								sx={{
									textTransform: "none",
									fontWeight: 700,
								}}
							>
								New Quotation
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
															{d.dealer_id}
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
		</>
	);
}