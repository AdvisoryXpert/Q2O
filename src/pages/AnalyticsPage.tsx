import React, { useEffect, useState } from 'react';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { Box, Typography, TextField, Button } from '@mui/material';
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

const AnalyticsPage: React.FC = () => {

	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [summary, setSummary] = useState<SummaryData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filter states
	const [filterUserId, setFilterUserId] = useState<string>('');
	const [filterEventType, setFilterEventType] = useState<string>('');
	const [filterStartDate, setFilterStartDate] = useState<string>('');
	const [filterEndDate, setFilterEndDate] = useState<string>('');

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
			console.error("Failed to fetch analytics data:", err);
			setError(err.message || "An unknown error occurred");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAnalyticsData();
	}, []); // Initial fetch

	const handleFilterApply = () => {
		fetchAnalyticsData();
	};

	const columns: MRT_ColumnDef<LogEntry>[] = React.useMemo(
		() => [
			{ accessorKey: 'id', header: 'ID', size: 50 },
			{ accessorKey: 'user_id', header: 'User ID', size: 80 },
			{ accessorKey: 'timestamp', header: 'Timestamp', size: 150 },
			{ accessorKey: 'ip_address', header: 'IP Address', size: 120 },
			{ accessorKey: 'device_info', header: 'Device Info', size: 200 },
			{ accessorKey: 'location', header: 'Location', size: 100 },
			{ accessorKey: 'page_accessed', header: 'Page Accessed', size: 150 },
			{ accessorKey: 'event_type', header: 'Event Type', size: 100 },
			{ accessorKey: 'session_id', header: 'Session ID', size: 150 },
		],
		[],
	);

	return (
		<>
			<Box sx={{ p: 3 }}>
				<Typography variant="h4" gutterBottom>User Activity Analytics</Typography>

				{summary && (
					<Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
						<Typography variant="h6">Total Events: {summary.total_events}</Typography>
						<Typography variant="h6">Unique Users: {summary.unique_users}</Typography>
						<Typography variant="h6">Unique IPs: {summary.unique_ips}</Typography>
						<Typography variant="h6">Total Logins: {summary.total_logins}</Typography>
					</Box>
				)}

				<Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
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
					<Button variant="contained" onClick={handleFilterApply}>Apply Filters</Button>
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
			</Box>
		</>
	);
};

export default AnalyticsPage;
