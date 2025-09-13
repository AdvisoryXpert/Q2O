import React, { useEffect, useMemo, useState } from "react";
import {
	Box,
	ToggleButton,
	ToggleButtonGroup,
	Stack,
	Typography,
	CircularProgress,
	Paper,
	Tooltip,
} from "@mui/material";
import {
	ResponsiveContainer,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip as RTooltip,
	Legend,
	CartesianGrid,
} from "recharts";
import { http } from "../../lib/http";

type Order = {
  order_id: number;
  date_created?: string | null;
  status?: string | null;
  total_price?: number | null;
};

type TimeRange = "7d" | "30d" | "90d" | "quarterly" | "yearly";
type Metric = "count" | "revenue";

const START_OF_DAY = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmtINR = (n: number) =>
	n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function startOfWeek(d: Date) {
	const day = d.getDay(); // Sun=0
	const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday-based
	return new Date(d.getFullYear(), d.getMonth(), diff);
}
function labelDay(d: Date) {
	return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}
function labelWeek(d: Date) {
	const end = new Date(d);
	end.setDate(end.getDate() + 6);
	return `${labelDay(d)}–${labelDay(end)}`;
}
function labelMonth(d: Date) {
	return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function pickTopStatuses(orders: Order[], k = 5): string[] {
	const counts: Record<string, number> = {};
	for (const o of orders) {
		const s = (o.status || "Unknown").trim() || "Unknown";
		counts[s] = (counts[s] || 0) + 1;
	}
	return Object.entries(counts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, k)
		.map(([s]) => s);
}

// Normalize various API response shapes into an Order[]
function normalizeOrdersPayload(payload: any): Order[] {
	if (!payload) return [];
	if (Array.isArray(payload)) return payload as Order[];
	if (Array.isArray(payload.orders)) return payload.orders as Order[];
	if (Array.isArray(payload.data)) return payload.data as Order[];
	if (Array.isArray(payload.results)) return payload.results as Order[];
	return [];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export default function OrdersOverview() {
	const [loading, setLoading] = useState(true);
	const [orders, setOrders] = useState<Order[]>([]);
	const [range, setRange] = useState<TimeRange>("90d");
	const [metric, setMetric] = useState<Metric>("count");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			setLoading(true);
			setError(null);
			try {
				const r = await http.get("/recentorders");
				const rows = normalizeOrdersPayload(r?.data);
				setOrders(rows);
				if (!rows.length) setError("No orders found for the selected range.");
			} catch (e) {
				console.error(e);
				setError("Failed to fetch orders.");
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	// If no statuses detected, fall back to a single "All" series so the chart isn't empty.
	const statuses = useMemo(() => {
		const s = pickTopStatuses(orders, 5);
		return s.length ? s : ["All"];
	}, [orders]);

	const data = useMemo(() => {
		const out: Array<Record<string, any>> = [];
		const now = START_OF_DAY(new Date());
		const from = new Date(now);
		if (range === "7d") from.setDate(now.getDate() - 6);
		if (range === "30d") from.setDate(now.getDate() - 29);
		if (range === "90d") from.setDate(now.getDate() - 89);
		if (range === "quarterly") {
			const quarter = Math.floor(now.getMonth() / 3);
			from.setMonth(quarter * 3, 1);
		}
		if (range === "yearly") {
			from.setFullYear(now.getFullYear(), 0, 1);
		}

    type Bucket = { key: string; start: Date; values: Record<string, number> };
    const buckets: Bucket[] = [];

    const pushBucket = (start: Date, key: string) => {
    	const values: Record<string, number> = {};
    	statuses.forEach((s) => (values[s] = 0));
    	buckets.push({ key, start, values });
    };

    if (range === "7d") {
    	for (let d = new Date(from); d <= now; d.setDate(d.getDate() + 1)) {
    		const day = new Date(d);
    		pushBucket(day, labelDay(day));
    	}
    } else if (range === "yearly") {
    	let d = new Date(from);
    	while (d <= now) {
    		pushBucket(new Date(d), labelMonth(d));
    		d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    	}
    } else { // 30d, 90d, quarterly
    	for (let d = startOfWeek(from); d <= now; d.setDate(d.getDate() + 7)) {
    		const wk = new Date(d);
    		pushBucket(wk, labelWeek(wk));
    	}
    }

    const findBucketIndex = (dt: Date) => {
    	if (range === "7d") return buckets.findIndex((b) => b.key === labelDay(dt));
    	if (range === "yearly") {
    		const s = new Date(dt.getFullYear(), dt.getMonth(), 1).getTime();
    		return buckets.findIndex((b) => b.start.getTime() === s);
    	}
    	const s = startOfWeek(dt).getTime();
    	return buckets.findIndex((b) => b.start.getTime() === s);
    };

    for (const o of orders) {
    	const t = o.date_created ? Date.parse(o.date_created) : NaN;
    	if (Number.isNaN(t)) continue;
    	const when = START_OF_DAY(new Date(t));
    	if (when < from || when > now) continue;

    	const idx = findBucketIndex(when);
    	if (idx < 0) continue;

    	const amt =
        typeof o.total_price === "number" && !Number.isNaN(o.total_price) ? o.total_price : 0;

    	if (statuses.length === 1 && statuses[0] === "All") {
    		buckets[idx].values["All"] += metric === "count" ? 1 : amt;
    	} else {
    		const status = (o.status || "Unknown").trim() || "Unknown";
    		if (!statuses.includes(status)) continue;
    		buckets[idx].values[status] += metric === "count" ? 1 : amt;
    	}
    }

    for (const b of buckets) out.push({ name: b.key, ...b.values });
    return out;
	}, [orders, range, metric, statuses]);

	return (
		<Paper
			elevation={0}
			sx={{
				p: 2,
				borderRadius: 2,
				border: (t) => `1px solid ${t.palette.divider}`,
				height: "100%",
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Stack
				direction={{ xs: "column", sm: "row" }}
				spacing={1}
				alignItems={{ xs: "flex-start", sm: "center" }}
				justifyContent="space-between"
				sx={{ mb: 1 }}
			>
				<Typography variant="h6" fontWeight={800}>
					Orders Overview
				</Typography>

				<Stack direction="row" spacing={1}>
					<ToggleButtonGroup
						size="small"
						color="primary"
						value={range}
						exclusive
						onChange={(_, v: TimeRange | null) => v && setRange(v)}
					>
						<ToggleButton value="7d">7D</ToggleButton>
						<ToggleButton value="30d">30D</ToggleButton>
						<ToggleButton value="90d">90D</ToggleButton>
						<ToggleButton value="quarterly">Quarterly</ToggleButton>
						<ToggleButton value="yearly">Yearly</ToggleButton>
					</ToggleButtonGroup>

					<ToggleButtonGroup
						size="small"
						value={metric}
						exclusive
						onChange={(_, v: Metric | null) => v && setMetric(v)}
					>
						<ToggleButton value="count">ORDERS</ToggleButton>
						<ToggleButton value="revenue">REVENUE</ToggleButton>
					</ToggleButtonGroup>
				</Stack>
			</Stack>

			<Box sx={{ height: 320 }}>
				{loading ? (
					<Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
						<CircularProgress size={28} />
					</Stack>
				) : data.length === 0 ? (
					<Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
						<Typography color="text.secondary">
							{error || "No data in this range."}
						</Typography>
					</Stack>
				) : (
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="name" />
							<YAxis
								tickFormatter={(v: number) =>
									metric === "count" ? String(v) : fmtINR(v).replace("₹", "₹ ")
								}
							/>
							<RTooltip
								formatter={(value: any, name: string) =>
									metric === "count"
										? [`${value}`, name]
										: [fmtINR(Number(value)), name]
								}
							/>
							<Legend />
							{statuses.map((s, i) => (
								<Bar key={s} dataKey={s} stackId="a" fill={COLORS[i % COLORS.length]} />
							))}
						</BarChart>
					</ResponsiveContainer>
				)}
			</Box>

			<Tooltip
				title={
					metric === "count"
						? "Daily (7D) or weekly (30/90D) order counts."
						: "Daily (7D) or weekly (30/90D) revenue."
				}
			>
				<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
					Grouped by {range === "7d" ? "day" : "week"} • Top statuses only • Toggle range/metric above
				</Typography>
			</Tooltip>
		</Paper>
	);
}
