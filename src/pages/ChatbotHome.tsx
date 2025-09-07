import React, { useState } from 'react';
import {
	Box,
	Typography,
	Grid,
	TextField,
	Paper,
	useTheme,
	Button,
} from '@mui/material';
import ReminderSection from '../components/reminders';
import App from '../App';
import QuotationList from './QuotationPage';
//import { http } from '../lib/http';
import { useNavigate } from 'react-router-dom';
import OrdersDashboard from '../components/Dashboard/OrdersDashboard';

const ChatbotHome: React.FC = () => {
	const theme = useTheme();
	    const navigate = useNavigate();
	
	const [serialNumber, setSerialNumber] = useState('');
	    const handleSearch = () => {
		if (!serialNumber.trim()) return;
		navigate(`/warranty?serial_number=${serialNumber}`);
	};
	return (
		        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: '100vh' }}>			<ReminderSection />
			<Grid item xs sx={{ p: 2, flexGrow: 1 }}>
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
							sx={{ backgroundColor: '#fff', borderRadius: 1, width: { xs: '100%', md: '50%' } }}
						/>						<Button variant="contained" onClick={handleSearch}>Search</Button>
					</Box>
				</Box>

				                <OrdersDashboard />
				
				{/* Quotation List - Compact */}
				<Paper elevation={0} sx={{ width: '100%', p: 1,
					borderRadius: 1, display: 'flex', flexDirection: 'column' }}
				>
					<Typography variant="subtitle2" sx={{ mb: 1 }}>
						Recent Quotes
					</Typography>
					<QuotationList limit={10} />
				</Paper>			</Grid>

			{/* Floating Chatbot - Bottom Right */}
			<Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 999 }}>
				<App />
			</Box>
		</Box>
	);
};

export default ChatbotHome;
