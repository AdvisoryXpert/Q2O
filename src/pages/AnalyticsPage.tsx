// src/pages/AnalyticsPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import {
	Box,
	Typography,
	TextField,
	Button,
	Paper,
	Divider,
	useTheme,
	useMediaQuery,
} from '@mui/material';
import { http } from '../lib/http';

type LogEntry = {
  id: number;
  user_id: number;
  timestamp: string;
  ip_address: string;
  device_info: string;
  location: string;
  page_accessed: string;
  event_type: string;
  session_id: string;
};

type SummaryData = {
  total_events: number;
  unique_users: number;
  unique_ips: number;
  total_logins: number;
};

const AnalyticsContent: React.FC = () => {
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [summary, setSummary] = useState<SummaryData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filters
	const [filterUserId, setFilterUserId] = useState('');
	const [filterEventType, setFilterEventType] = useState('');
	const [filterStartDate, setFilterStartDate] = useState('');
	const [filterEndDate, setFilterEndDate] = useState('');

	const fetchAnalyticsData = async () => {
		setLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams();
			if (filterUserId) params.append('user_id', filterUserId);
			if (filterEventType) params.append('event_type', filterEventType);
			if (filterStartDate) params.append('start_date', filterStartDate);
			if (filterEndDate) params.append('end_date', filterEndDate);

			const [logsRes, summaryRes] = await Promise.all([
				http.get(`/analytics/logs?${params.toString()}`),
				http.get('/analytics/summary'),
			]);
			setLogs(logsRes.data);
			setSummary(summaryRes.data);
		} catch (err: any) {
			console.error('Failed to fetch analytics data:', err);
			setError(err.message || 'An unknown error occurred');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAnalyticsData();
	}, []); // initial

	const handleFilterApply = () => fetchAnalyticsData();

	const columns: MRT_ColumnDef<LogEntry>[] = useMemo(
		() => [
			{ accessorKey: 'id', header: 'ID', size: 50 },
			{ accessorKey: 'user_id', header: 'User ID', size: 80 },
			{ accessorKey: 'timestamp', header: 'Timestamp', size: 150 },
			{ accessorKey: 'ip_address', header: 'IP Address', size: 120 },
			{ accessorKey: 'device_info', header: 'Device Info', size: 200 },
			{ accessorKey: 'location', header: 'Location', size: 120 },
			{ accessorKey: 'page_accessed', header: 'Page Accessed', size: 160 },
			{ accessorKey: 'event_type', header: 'Event Type', size: 120 },
			{ accessorKey: 'session_id', header: 'Session ID', size: 160 },
		],
		[]
	);

	return (
		<Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 2 }}>
			{/* Title */}
			<Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
				User Activity Analytics
			</Typography>

			{/* Summary block */}
			<Paper elevation={3} sx={{ p: 3, mb: 3 }}>
				<Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
					Summary
				</Typography>
				{summary ? (
					<Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
						<Box><Typography variant="body2" color="text.secondary">Total Events</Typography><Typography variant="h6">{summary.total_events}</Typography></Box>
						<Box><Typography variant="body2" color="text.secondary">Unique Users</Typography><Typography variant="h6">{summary.unique_users}</Typography></Box>
						<Box><Typography variant="body2" color="text.secondary">Unique IPs</Typography><Typography variant="h6">{summary.unique_ips}</Typography></Box>
						<Box><Typography variant="body2" color="text.secondary">Total Logins</Typography><Typography variant="h6">{summary.total_logins}</Typography></Box>
					</Box>
				) : (
					<Typography color="text.secondary">No summary yet.</Typography>
				)}
			</Paper>

			{/* Filters block */}
			<Paper elevation={3} sx={{ p: 3, mb: 3 }}>
				<Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
					Filters
				</Typography>
				<Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
					<TextField
						label="User ID"
						value={filterUserId}
						onChange={(e) => setFilterUserId(e.target.value)}
						size="small"
					/>
					<TextField
						label="Event Type"
						value={filterEventType}
						onChange={(e) => setFilterEventType(e.target.value)}
						size="small"
					/>
					<TextField
						label="Start Date"
						type="date"
						value={filterStartDate}
						onChange={(e) => setFilterStartDate(e.target.value)}
						InputLabelProps={{ shrink: true }}
						size="small"
					/>
					<TextField
						label="End Date"
						type="date"
						value={filterEndDate}
						onChange={(e) => setFilterEndDate(e.target.value)}
						InputLabelProps={{ shrink: true }}
						size="small"
					/>
					<Button variant="contained" onClick={handleFilterApply}>
						Apply Filters
					</Button>
				</Box>
			</Paper>

			{/* Table block */}
			<Paper elevation={3} sx={{ p: 3 }}>
				<Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
					<Typography variant="h6" sx={{ fontWeight: 700, mr: 2 }}>
						Logs
					</Typography>
					<Divider sx={{ flex: 1 }} />
				</Box>

				{loading ? (
					<Typography>Loading analytics data...</Typography>
				) : error ? (
					<Typography color="error">Error: {error}</Typography>
				) : (
					<MaterialReactTable
						columns={columns}
						data={logs}
						enableColumnActions={false}
						enableColumnFilters={false}
						enablePagination
						enableSorting
						initialState={{ density: 'compact' }}
					/>
				)}
			</Paper>
		</Box>
	);
};

export default function AnalyticsPage() {
	// Mirror the fixed container + scroll behavior from UserAdminPage
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

	return (
		<Paper
			sx={{
				position: 'fixed',
				left: isMobile ? 0 : 'var(--app-drawer-width, 240px)',
				top: 'var(--app-header-height, 56px)',
				right: 0,
				bottom: 0,
				display: 'flex',
				flexDirection: 'column',
				borderRadius: 2,
				boxShadow: 3,
				overflow: 'hidden',
			}}
			elevation={3}
		>
			{/* Scrollable content area to stack vertical blocks */}
			<Box sx={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
				<AnalyticsContent />
			</Box>
		</Paper>
	);
}
