import React, { useEffect, useState } from 'react';
import { getUserId } from '../services/AuthService';
import { Typography, Paper, Button, Stack, Box } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { http } from '../lib/http'; 
import { useNavigate } from 'react-router-dom';

const ReminderSection = () => {
	const [reminders, setReminders] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const remindersPerPage = 8;
	const navigate = useNavigate();

	useEffect(() => {
		const fetchReminders = async () => {
			try {
				const user_id = await getUserId();
				if (!user_id) {
					console.warn("User ID not found. Cannot fetch reminders.");
					// Use sample data if user ID not found
					setReminders([
						{ id: 1, type: 'quote', title: 'Follow up on Quote id 27', quoteId: 27 },
						{ id: 2, type: 'quote', title: 'Follow up on Quote id 28', quoteId: 28 },
						{ id: 3, type: 'quote', title: 'Follow up on Quote id 29', quoteId: 29 },
						{ id: 4, type: 'quote', title: 'Follow up on Quote id 30', quoteId: 30 },
						{ id: 5, type: 'quote', title: 'Follow up on Quote id 31', quoteId: 31 },
						{ id: 6, type: 'quote', title: 'Follow up on Quote id 32', quoteId: 32 },
					]);
					return;
				}
				const res = await http.get(`/reminders?user_id=${user_id}`);
				setReminders(res.data);
			} catch (err) {
				console.error("Error fetching reminders:", err);
				// Fallback to sample data if API fails
				setReminders([
					{ id: 1, type: 'quote', title: 'Follow up on Quote id 27', quoteId: 27 },
					{ id: 2, type: 'quote', title: 'Follow up on Quote id 28', quoteId: 28 },
					{ id: 3, type: 'quote', title: 'Follow up on Quote id 29', quoteId: 29 },
					{ id: 4, type: 'quote', title: 'Follow up on Quote id 30', quoteId: 30 },
					{ id: 5, type: 'quote', title: 'Follow up on Quote id 31', quoteId: 31 },
					{ id: 6, type: 'quote', title: 'Follow up on Quote id 32', quoteId: 32 },
				]);
			}
		};

		fetchReminders();
	}, []);

	const getReminderStyle = (type: string) => {
		switch (type) {
		case 'quote':
			return {
				icon: <DescriptionIcon sx={{ color: '#2196f3', mr: 1 }} />,
				bgColor: '#e3f2fd',
			};
		case 'lr':
			return {
				icon: <LocalShippingIcon sx={{ color: '#4caf50', mr: 1 }} />,
				bgColor: '#e8f5e9',
			};
		case 'service':
			return {
				icon: <NotificationsActiveIcon sx={{ color: '#f44336', mr: 1 }} />,
				bgColor: '#ffebee', 
			};			
		default:
			return {
				icon: <NotificationsActiveIcon sx={{ color: '#ff9800', mr: 1 }} />,
				bgColor: '#fffde7',
			};
		}
	};

	const totalPages = Math.ceil(reminders.length / remindersPerPage);
	const startIndex = (currentPage - 1) * remindersPerPage;
	const currentReminders = reminders.slice(startIndex, startIndex + remindersPerPage);

	return (
		<Box>
			{Array.isArray(currentReminders) && currentReminders.length > 0 ? (
				currentReminders.map((reminder, index) => {
					const { icon, bgColor } = getReminderStyle(reminder.type);
					return (
						<Paper
							key={index}
							elevation={2}
							sx={{
								p: 2,
								mb: 2,
								backgroundColor: bgColor,
								cursor: 'pointer',
								transition: '0.2s ease',
								'&:hover': {
									boxShadow: reminder.type === 'quote' ? 4 : 1,
									transform: reminder.type === 'quote' ? 'scale(1.01)' : 'none',
								},
							}}
							onClick={() => {
								if (reminder.type === 'quote' && reminder.quoteId) {
									navigate(`/quotation-items/${reminder.quoteId}`);
								}else if (reminder.type === 'lr' && reminder.lrId) {
									navigate(`/lr-item?id=${reminder.lrId}`);
								}else if (reminder.type === 'service' && reminder.serviceId) {
									navigate(`/serviceRequest/${reminder.serviceId}`);
								}
							}}
						>
							<Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
								{icon} {reminder.title}
							</Typography>
						</Paper>
					);
				})
			) : (
				<Paper elevation={0} sx={{ p: 2, mt: 2, color: 'text.secondary' }}>
					<Typography variant="body2">✅ No reminders for now.</Typography>
				</Paper>
			)}

			{reminders.length > remindersPerPage && (
				<Stack direction="row" justifyContent="space-between" mt={2}>
					<Button
						variant="outlined"
						size="small"
						onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
						disabled={currentPage === 1}
					>
						Previous
					</Button>
					<Button
						variant="outlined"
						size="small"
						onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
						disabled={currentPage === totalPages}
					>
						Next
					</Button>
				</Stack>
			)}
		</Box>
	);
};

export default ReminderSection;