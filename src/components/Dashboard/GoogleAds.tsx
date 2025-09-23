import React from 'react';
import { Paper, Typography } from '@mui/material';

const GoogleAds: React.FC = () => {
	return (
		<Paper
			elevation={0}
			sx={{
				p: 2,
				borderRadius: 2,
				border: (t) => `1px solid ${t.palette.divider}`,
				width: '100%',
				height: '100%',
			}}
		>
			<Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
				Google Ads
			</Typography>
			<Typography variant="body1">Google Ads Content</Typography>
		</Paper>
	);
};

export default GoogleAds;
