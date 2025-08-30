import React, { useEffect, useState } from 'react';
import {
	Box,
	Typography,
	Grid,
	TextField,
	Paper,
	useTheme,
	Button,
} from '@mui/material';
import TopAppBar from '../navBars/topAppBar';
import ReminderSection from '../components/reminders';
import { useNavAccess } from '../navBars/navBars';
import App from '../App';
import QuotationList from './QuotationPage';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API from '../apiConfig'; 
import {
	ResponsiveContainer,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
	Legend,
	Cell,
} from 'recharts';

const ChatbotHome: React.FC = () => {
	const navItems = useNavAccess();
	const theme = useTheme();
	const navigate = useNavigate();

	const [serialNumber, setSerialNumber] = useState('');
	const [orderStats, setOrderStats] = useState<{ date: string; orders: number }[]>([]);

	useEffect(() => {
		axios.get(`${API}/api/quote-status-count`)
			.then(response => {
				setOrderStats(response.data);
			})
			.catch(error => {
				console.error('Error fetching order stats:', error);
			});
	}, []);

	const handleSearch = () => {
		if (!serialNumber.trim()) return;
		navigate(`/warranty?serial_number=${serialNumber}`);
	};

	const colors = ['#42a5f5', '#66bb6a', '#ffa726', '#ab47bc', '#26a69a', '#ef5350', '#8d6e63'];

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
			<TopAppBar navItems={navItems} />

			<Grid container sx={{ flexGrow: 1 }}>
				<ReminderSection />

				{/* Main Content Area */}
				<Grid item xs={12} md={10} sx={{ p: 2, flexGrow: 1 }}>
					{/* Serial Number Search */}
					<Box sx={{ mb: 2 }}>
						<Typography
							variant="h6"
							sx={{ mb: 1, fontWeight: 600, color: theme.palette.primary.dark }}
						>
							Search by serial number (components)
						</Typography>
						<Box sx={{ display: 'flex', gap: 2 }}>
							<TextField
								size="small"
								variant="outlined"
								placeholder="Enter Serial Number"
								value={serialNumber}
								onChange={(e) => setSerialNumber(e.target.value)}
								sx={{ backgroundColor: '#fff', borderRadius: 1, width: '50%' }}
							/>
							<Button variant="contained" onClick={handleSearch}>Search</Button>
						</Box>
					</Box>

					{/* Sleek and Colorful Chart */}
					<Paper
						elevation={1}
						sx={{ mb: 2, p: 2, borderRadius: 2, backgroundColor: '#e3f2fd' }}
					>
						<Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
							📊 Orders Created from Quotes
						</Typography>
						<Box sx={{ width: '75%', height: 200 }}>
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={orderStats} barCategoryGap={20}>
									<CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
									<XAxis dataKey="quote_created" tick={{ fontSize: 12 }} />
									<YAxis tick={{ fontSize: 12 }} />
									<Tooltip cursor={{ fill: '#f5f5f5' }} />
									<Legend verticalAlign="top" height={20} />
									<Bar dataKey="orders" radius={[4, 4, 0, 0]}>
										{orderStats.map((entry, index) => (
											<Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</Box>
					</Paper>

					{/* Quotation List - Compact */}
					<Paper elevation={0} sx={{ width: '100%', p: 1,
						borderRadius: 1, display: 'flex', flexDirection: 'column' }}
					>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
						</Typography>
						<QuotationList compact />
					</Paper>
				</Grid>
			</Grid>

			{/* Floating Chatbot - Bottom Right */}
			<Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 999 }}>
				<App />
			</Box>
		</Box>
	);
};

export default ChatbotHome;
