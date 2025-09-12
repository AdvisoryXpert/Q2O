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
import RecentQuotes from "../components/dashboard/RecentQuotes";
import OrdersOverview from "../components/dashboard/OrdersOverview";
import App from "../App";
import { useNavigate } from "react-router-dom";

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
						<Grid item xs={12} md={4}>
							<Typography variant="h5" fontWeight={800}>
								Welcome back!
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Quotes, reminders, and orders at a glance.
							</Typography>
						</Grid>

						<Grid item xs={12} md={8}>
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
					</Grid>
				</Container>
			</Box>

			{/* Main content */}
			<Container maxWidth="xl" sx={{ py: 2 }}>
				<Grid container spacing={2}>
					{/* Left column: Reminders */}
					<Grid item xs={12} md={5} lg={4}>
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

					{/* Right column: Orders overview + Recent quotes */}
					<Grid item xs={12} md={7} lg={8}>
						<Grid container spacing={2} direction="column">
							<Grid item>
								<OrdersOverview />
							</Grid>
							<Grid item>
								<RecentQuotes limit={10} />
							</Grid>
						</Grid>
					</Grid>
				</Grid>
			</Container>

			{/* Floating Chatbot */}
			<Box sx={{ position: "fixed", bottom: 16, right: 16, zIndex: 999 }}>
				<App />
			</Box>
		</Box>
	);
};

export default ChatbotHome;
