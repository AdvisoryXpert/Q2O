import React, { useState } from "react";
import {
	Box,
	Typography,
	Grid,
	TextField,
	Paper,
	useTheme,
	Button,
	Container,
	Stack,
	InputAdornment,
	Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import ReminderSection from "../components/reminders";
//import GoogleAds from "../components/Dashboard/GoogleAds";
//import RecentQuotes from "../components/Dashboard/RecentQuotes";
import OrdersOverview from "../components/Dashboard/OrdersOverview";
import { useNavigate } from "react-router-dom";
import DealerFollowUps from "../components/Dashboard/DealerFollowUps";
import TenantDisplay from "../components/TenantDisplay";

const ChatbotHome: React.FC = () => {
	const theme = useTheme();
	const navigate = useNavigate();
	const [serialNumber, setSerialNumber] = useState("");

	const handleSearch = () => {
		const q = serialNumber.trim();
		if (!q) return;
		navigate(`/warranty?serial_number=${encodeURIComponent(q)}`);
	};

	return (
		<Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
			{/* Header */}
			<Box
				sx={{
					py: { xs: 2, md: 3 },
					background:
            "linear-gradient(90deg, rgba(0,82,204,0.12) 0%, rgba(2,132,199,0.12) 100%)",
					borderBottom: `1px solid ${theme.palette.divider}`,
				}}
			>
				<Container maxWidth="xl">
					<Grid container spacing={2} alignItems="center">
						<Grid item xs={12} md={12}>
							<TenantDisplay />
							<Typography variant="body2" color="text.secondary">
								Quotes, reminders, and orders at a glance.
							</Typography>
						</Grid>
					</Grid>
				</Container>
			</Box>

			{/* Main content */}
			<Container maxWidth="xl" sx={{ py: 2 }}>
				<Grid container spacing={2}>
					{/* First Row */}
					<Grid item xs={12} md={4} sx={{ minWidth: 0 }}>
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
									Reminders
								</Typography>
							</Stack>
							<Divider sx={{ mb: 1 }} />
							<Box
								sx={{
									flex: 1,
									maxHeight: { xs: 560, md: "calc(100vh - 280px)" },
									overflow: "auto",
									pr: 0.5,
									"& *": { minWidth: 0 },
								}}
							>
								<ReminderSection />
							</Box>
						</Paper>
					</Grid>
					<Grid item xs={12} md={4} sx={{ minWidth: 0 }}>						
						<Grid item xs={12} sx={{mt: 0}}>
							<Paper
								elevation={0}
								sx={{
									p: 1,
									borderRadius: 2,
									border: `1px solid ${theme.palette.divider}`,
									bgcolor: "background.paper",
								}}
							>
								<Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
									<TextField
										fullWidth
										size="medium"
										placeholder="Search by serial number (components)"
										value={serialNumber}
										onChange={(e) => setSerialNumber(e.target.value)}
										onKeyDown={(e) => e.key === "Enter" && handleSearch()}
										InputProps={{
											startAdornment: (
												<InputAdornment position="start">
													<SearchIcon />
												</InputAdornment>
											),
										}}
									/>
									<Button
										variant="contained"
										size="large"
										sx={{ px: 3, fontWeight: 700, whiteSpace: "nowrap" }}
										onClick={handleSearch}
									>
										Search
									</Button>
									{/* Removed the “New Quotation” button as requested */}
								</Stack>
							</Paper>
						</Grid>
						<Grid item xs={12} sx={{mt: 2}}>
							<OrdersOverview />
						</Grid>
					</Grid>
					<Grid item xs={12} md={4} sx={{ minWidth: 0 }}>
						<DealerFollowUps />
					</Grid>
				</Grid>
				<Grid container spacing={2} sx={{ mt: 2 }}>
					{/* Second Row */}
					{/* <Grid item xs={12}>
						<RecentQuotes limit={10} />
					</Grid> */}
					{/* <Grid item xs={12}>
						<GoogleAds />
					</Grid> */}
				</Grid>
			</Container>

		</Box>
	);
};

export default ChatbotHome;