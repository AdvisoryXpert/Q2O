import { useEffect, useMemo, useState } from "react";
import {
	AppBar,
	Avatar,
	Box,
	Card,
	CardContent,
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
import FilterListIcon from "@mui/icons-material/FilterList";
import { http } from "../lib/http";
import { useNavigate } from "react-router-dom";
import VisibilityIcon from '@mui/icons-material/Visibility';

/** Types */
type Order = {
  order_id: number;
  customer_name: string;
  dealer_id: number;
  date_created: string;
  status: string;
  invoice_id?: string;
};

type Dealer = {
  dealer_id: number;
  full_name: string;
};

/** API helpers */
async function fetchOrders(): Promise<Order[]> {
	const { data } = await http.get("/recentorders");
	return data ?? [];
}
async function fetchDealers(): Promise<Dealer[]> {
	const { data } = await http.get("/dealers");
	return data ?? [];
}

export default function OrderListPage() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const navigate = useNavigate();

	const [rows, setRows] = useState<Order[]>([]);
	const [dealers, setDealers] = useState<Dealer[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");

	useEffect(() => {
		(async () => {
			try {
				setLoading(true);
				const [ordersData, dealersData] = await Promise.all([fetchOrders(), fetchDealers()]);
				setRows(ordersData);
				setDealers(dealersData);
				setError(null);
			} catch {
				setError("Failed to load data.");
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((d) =>
			[d.order_id, d.customer_name, d.status, d.invoice_id]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q))
		);
	}, [rows, search]);

	const getDealerName = (dealerId: number) => {
		const dealer = dealers.find((d) => d.dealer_id === dealerId);
		return dealer ? dealer.full_name : dealerId;
	};

	/** DataGrid columns (desktop) */
	const columns: GridColDef[] = [
		{
			field: "order_id",
			headerName: "Order ID",
			flex: 1,
			minWidth: 150,
		},
		{
			field: "dealer_id",
			headerName: "Dealer",
			flex: 1,
			minWidth: 150,
			valueGetter: (params) => getDealerName(params.value as number),
		},
		{
			field: "date_created",
			headerName: "Date Created",
			flex: 1,
			minWidth: 150,
			valueFormatter: (params) => new Date(params.value as string).toLocaleDateString(),
		},
		{
			field: "status",
			headerName: "Status",
			flex: 1,
			minWidth: 150,
		},
		{
			field: "invoice_id",
			headerName: "Invoice ID",
			flex: 1,
			minWidth: 150,
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
				const d = p.row as Order;
				return (
					<Box sx={{ display: "flex", gap: 0.5 }}>
						<Tooltip title="Check Order Lines">
							<IconButton size="small" onClick={() => navigate(`/orders/${d.order_id}`)}>
								<VisibilityIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					</Box>
				);
			},
		},
	];

	const gridRows = useMemo(() => filtered.map((d) => ({ id: d.order_id, ...d })), [filtered]);

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
									<Grid item xs={12} key={d.order_id}>
										<Card variant="outlined" sx={{ borderRadius: 2 }}>
											<CardContent sx={{ py: 1.25 }}>
												<Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
													<Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: "primary.main" }}>
														{d.order_id.toString()?.[0] ?? "?"}
													</Avatar>
													<Box sx={{ minWidth: 0, flex: 1 }}>
														<Typography fontWeight={700} noWrap title={d.order_id.toString()}>
															{d.order_id}
														</Typography>
														<Typography variant="caption" color="text.secondary" noWrap>
															{getDealerName(d.dealer_id)}
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