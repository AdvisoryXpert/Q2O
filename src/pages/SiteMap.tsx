// SiteMap.tsx
import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ChatIcon from '@mui/icons-material/Chat';
import DescriptionIcon from '@mui/icons-material/Description';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import TopAppBar from '../navBars/topAppBar';
import { useNavAccess } from '../navBars/navBars';

type Section = {
  title: string;
  description: string;
  icon: React.ReactElement;
  bgColor: string;
}

const sections: Section[] = [
	{
		title: 'Home',
		description: 'Landing page with summary and navigation to all tools.',
		icon: <HomeIcon fontSize="large" />,
		bgColor: '#e1f5fe',
	},
	{
		title: 'Chatbot',
		description: 'Interactive assistant to generate quotations based on water parameters.',
		icon: <ChatIcon fontSize="large" />,
		bgColor: '#f3e5f5',
	},
	{
		title: 'Quotations',
		description: 'Access, manage, and revise all quotations.',
		icon: <DescriptionIcon fontSize="large" />,
		bgColor: '#e8f5e9',
	},
	{
		title: 'Analytics',
		description: 'Visualize water data and quotation trends.',
		icon: <BubbleChartIcon fontSize="large" />,
		bgColor: '#fff3e0',
	},
	{
		title: 'Alerts',
		description: 'Set up and manage notifications for critical TDS/Hardness levels.',
		icon: <NotificationsActiveIcon fontSize="large" />,
		bgColor: '#fce4ec',
	},
];

const SiteMap: React.FC = () => {
	const navItems = useNavAccess();

	return (
		<Box>
			<TopAppBar navItems={navItems} />
			<Box sx={{ p: 4 }}>
				<Typography variant="h4" gutterBottom>Site Map</Typography>
				<Grid container spacing={4}>
					{sections.map((section, index) => (
						<Grid item xs={12} sm={6} md={4} key={index}>
							<Paper
								elevation={3}
								sx={{
									p: 2,
									height: '100%',
									backgroundColor: section.bgColor,
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									justifyContent: 'center',
									textAlign: 'center',
								}}
							>
								{section.icon}
								<Typography variant="h6" sx={{ mt: 2 }}>{section.title}</Typography>
								<Typography variant="body2" sx={{ mt: 1 }}>{section.description}</Typography>
							</Paper>
						</Grid>
					))}
				</Grid>
			</Box>
		</Box>
	);
};

export default SiteMap;
