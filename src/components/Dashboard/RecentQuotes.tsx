import React, { useEffect, useMemo, useState } from "react";
import {
	Box,
	Chip,
	CircularProgress,
	IconButton,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import { http } from "../../lib/http";

type Quote = {
  quote_id: number;
  dealer_id?: number | string | null;
  dealer_name?: string | null;
  date_created?: string | null;
  total_price?: number | null;
  status?: string | null;
};

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

export default function RecentQuotes({ limit = 10 }: { limit?: number }) {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [rows, setRows] = useState<Quote[]>([]);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			setLoading(true);
			setError(null);
			try {
				// Try server-side limit first; gracefully fall back to client-side slice.
				let data: Quote[] = [];
				try {
					const r1 = await http.get(`/quotes-raw?limit=${limit}`);
					data = r1?.data ?? [];
				} catch {
					const r2 = await http.get("/quotes-raw");
					data = r2?.data ?? [];
				}

				// Sort newest first (by date_created, fallback to quote_id)
				const sorted = [...data].sort((a, b) => {
					const da = a?.date_created ? Date.parse(a.date_created) : NaN;
					const db = b?.date_created ? Date.parse(b.date_created) : NaN;
					if (!Number.isNaN(db) && !Number.isNaN(da)) return db - da;
					return (b?.quote_id ?? 0) - (a?.quote_id ?? 0);
				});

				setRows(sorted.slice(0, limit));
			} catch (e: any) {
				console.error("Failed to load recent quotes", e);
				setError("Failed to load recent quotes");
			} finally {
				setLoading(false);
			}
		})();
	}, [limit]);

	const content = useMemo(() => {
		if (loading) {
			return (
				<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 6 }}>
					<CircularProgress size={28} />
				</Box>
			);
		}
		if (error) {
			return (
				<Box sx={{ px: 2, py: 3 }}>
					<Typography color="error">{error}</Typography>
				</Box>
			);
		}
		if (!rows.length) {
			return (
				<Box sx={{ px: 2, py: 3 }}>
					<Typography color="text.secondary">No recent quotes.</Typography>
				</Box>
			);
		}

		return (
			<Table size="small" stickyHeader>
				<TableHead>
					<TableRow>
						<TableCell sx={{ fontWeight: 800 }}>Quote ID</TableCell>
						<TableCell sx={{ fontWeight: 800 }}>Dealer</TableCell>
						<TableCell sx={{ fontWeight: 800 }}>Date Created</TableCell>
						<TableCell sx={{ fontWeight: 800 }}>Total Price</TableCell>
						<TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
						<TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{rows.map((q) => (
						<TableRow key={q.quote_id} hover>
							<TableCell>{q.quote_id}</TableCell>
							<TableCell>{q.dealer_name ?? q.dealer_id ?? "-"}</TableCell>
							<TableCell>{safeDate(q.date_created)}</TableCell>
							<TableCell>{toINR(q.total_price)}</TableCell>
							<TableCell>
								<Chip
									size="small"
									variant="outlined"
									color={
										q.status === "Draft"
											? "warning"
											: q.status === "Approved"
												? "success"
												: q.status === "Cancelled"
													? "error"
													: "default"
									}
									label={q.status ?? "—"}
									sx={{ fontWeight: 700 }}
								/>
							</TableCell>
							<TableCell align="right">
								<Tooltip title="View">
									<IconButton size="small" onClick={() => navigate(`/quotation-items/${q.quote_id}`)}>
										<VisibilityIcon fontSize="small" />
									</IconButton>
								</Tooltip>
								<Tooltip title="Delete">
									<IconButton
										size="small"
										color="error"
										onClick={() => navigate(`/quotation/delete/${q.quote_id}`)}
									>
										<DeleteIcon fontSize="small" />
									</IconButton>
								</Tooltip>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
	}, [loading, error, rows, navigate]);

	return (
		<Paper
			elevation={0}
			sx={{
				p: 2,
				borderRadius: 2,
				border: (t) => `1px solid ${t.palette.divider}`,
				overflow: "hidden",
				width: "100%",
			}}
		>
			<Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
				Recent Quotes
			</Typography>
			<Box sx={{ maxHeight: 520, overflow: "auto", pr: 0.5 }}>{content}</Box>
		</Paper>
	);
}
