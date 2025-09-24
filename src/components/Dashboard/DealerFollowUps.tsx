import React, { useState, useEffect } from "react";
import axios from "axios";
import {
	Box,
	Typography,
	Paper,
	useTheme,
	Stack,
	Divider,
	Button,
	Chip,
	Card,
	CardContent,
} from "@mui/material";
import { keyframes } from "@mui/system";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { useNavigate } from "react-router-dom";

import { getToken } from "../../services/AuthService";

const blink = keyframes`
  0% { opacity: 1; color: #FFC107; }
  25% { opacity: 0.5; color: #4CAF50; }
  50% { opacity: 0; }
  75% { opacity: 0.5; color: #2196F3; }
  100% { opacity: 1; color: #9C27B0; }
`;

const entityTypeColors: { [key: string]: string } = {
	quote: "#FFC107", // Amber
	order: "#4CAF50", // Green
	sr: "#2196F3", // Blue
	lr: "#9C27B0", // Purple
};

const DealerFollowUps: React.FC = () => {
	const theme = useTheme();
	const [dealerFollowUps, setDealerFollowUps] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchDealerFollowUps = async () => {
			try {
				const token = getToken();
				const response = await axios.get("/api/dealer-followups", {
					headers: {
						Authorization: `Bearer ${token}`,
					},
					withCredentials: true,
				});
				setDealerFollowUps(response.data ?? []);
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
					maxHeight: "70vh",
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
					<Stack spacing={2}>
						{dealerFollowUps.map((dealer, i) => (
							<Card
								key={
									dealer.dealer_id ??
									dealer.id ??
									dealer.phone ??
									dealer.email ??
									`${dealer.dealer_name ?? "dealer"}-${i}`
								}
								sx={{
									transition: "box-shadow 0.3s",
									"&:hover": {
										boxShadow: theme.shadows[4],
									},
								}}
							>
								<CardContent>
									<Stack direction="row" alignItems="center" spacing={1}>
										<Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
											{dealer.dealer_name}
										</Typography>
										{dealer.is_important && (
											<Typography
												component="span"
												sx={{
													animation: `${blink} 2s linear infinite`,
													fontWeight: "bold",
													fontSize: theme.typography.h4.fontSize,
												}}
											>
												*
											</Typography>
										)}
									</Stack>

									{Object.keys(dealer.follow_ups ?? {}).map((entity_type) => (
										<Box key={entity_type} sx={{ mt: 1 }}>
											<Stack spacing={1}>
												{(dealer.follow_ups?.[entity_type] ?? []).map(
													(fu: any, index: number) => {
														let path = "";
														if (entity_type === "quote")
															path = `/quotation-items/${fu.entity_id}`;
														else if (entity_type === "sr")
															path = `/serviceRequest/${fu.entity_id}`;
														else if (entity_type === "lr")
															path = `/lr-item?id=${fu.entity_id}`;
														else if (entity_type === "order")
															path = `/orders/${fu.entity_id}`;
														return (
															<Button
																key={
																	fu.followup_id ||
																	`${entity_type}-${fu.entity_id}-${index}`
																}
																onClick={() => path && navigate(path)}
																sx={{
																	textTransform: "none",
																	justifyContent: "flex-start",
																	padding: "2px 8px",
																	minWidth: 0,
																	borderRadius: "16px",
																	"&:hover": {
																		backgroundColor: theme.palette.action.hover,
																	},
																}}
															>
																<Stack direction="row" alignItems="center" spacing={1}>
																	<Chip
																		label={String(entity_type).toUpperCase()}
																		size="small"
																		sx={{
																			backgroundColor:
																				entityTypeColors[entity_type] ||
																				theme.palette.grey[300],
																			color: "white",
																			fontWeight: "bold",
																		}}
																	/>
																	<Typography variant="body2">
																		#{fu.entity_id}: {fu.status} (Due:{" "}
																		{new Date(
																			fu.due_date
																		).toLocaleDateString()}
																		)
																		{fu.is_overdue && (
																			<Typography
																				component="span"
																				variant="body2"
																				sx={{
																					color: theme.palette.error.main,
																					fontWeight: "bold",
																				}}
																			>
																				{" (Overdue)"}
																			</Typography>
																		)}
																	</Typography>
																</Stack>
															</Button>
														);
													}
												)}
											</Stack>
										</Box>
									))}
								</CardContent>
							</Card>
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
