import React, { useState, useEffect } from "react";
import axios from "axios";
import {
	Box,
	Typography,
	Paper,
	useTheme,
	Stack,
	Divider,
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";

import { getToken } from "../../services/AuthService";

const DealerFollowUps: React.FC = () => {
	const theme = useTheme();
	const [dealerFollowUps, setDealerFollowUps] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchDealerFollowUps = async () => {
			try {
				const token = getToken();
				const response = await axios.get("/api/dealer-followups", {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
				setDealerFollowUps(response.data);
			} catch (error) {
				console.error("Error fetching dealer follow-ups:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchDealerFollowUps();
	}, []);

	return (
		<Paper
			elevation={0}
			sx={{
				p: 2,
				borderRadius: 2,
				border: `1px solid ${theme.palette.divider}`,
				height: "100%",
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
				<NotificationsActiveIcon color="primary" />
				<Typography variant="h6" fontWeight={700}>
					Dealer Follow-ups
				</Typography>
			</Stack>
			<Divider sx={{ mb: 1 }} />
			<Box
				sx={{
					flex: 1,
					maxHeight: { xs: 300, md: "calc(50vh - 140px)" }, // Adjusted height
					overflow: "auto",
					pr: 0.5,
					"& *": { minWidth: 0 },
				}}
			>
				{isLoading ? (
					<Typography variant="body2" color="text.secondary">
						Loading follow-ups...
					</Typography>
				) : dealerFollowUps.length > 0 ? (
					<Stack spacing={1}>
						{dealerFollowUps.map((dealer) => (
							<Box key={dealer.dealer_id}>
								<Typography variant="body2">
									{dealer.dealer_name}
									{dealer.is_important ? " *" : ""}
								</Typography>
								{Object.keys(dealer.follow_ups).map((entity_type) => (
									<Box key={entity_type} sx={{ pl: 2 }}>
										<Typography variant="caption">
											{entity_type.toUpperCase()}
										</Typography>
										<Stack spacing={0.5}>
											{dealer.follow_ups[entity_type].map((fu: any, index: number) => (
												<Typography variant="body2" key={index}>
													- {fu.status} (Due: {new Date(fu.due_date).toLocaleDateString()})
													{fu.is_overdue && " (Overdue)"}
												</Typography>
											))}
										</Stack>
									</Box>
								))}
							</Box>
						))}
					</Stack>
				) : (
					<Typography variant="body2" color="text.secondary">
						No pending dealer follow-ups.
					</Typography>
				)}
			</Box>
		</Paper>
	);
};

export default DealerFollowUps;
