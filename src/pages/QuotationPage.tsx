import React, { useEffect, useState } from 'react';
import {
	Box, Typography, Table, TableBody, TableCell, TableContainer,
	TableHead, TableRow, Paper, TablePagination, CircularProgress,
	Alert, Chip, IconButton, Snackbar, Grid, Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DraftsIcon from '@mui/icons-material/Drafts';
import SendIcon from '@mui/icons-material/Send';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { TablePaginationOwnProps } from '@mui/material/TablePagination';
import { http } from '../lib/http'; // ✅ use shared axios client (adds Authorization)
import { isAuthenticated } from '../services/AuthService'; // NEW IMPORT

type Quote = {
  quote_id: number;
  user_id: number;
  dealer_id: number | null;
  total_price: number;
  date_created: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
};

const CustomPaginationActions = (props: TablePaginationOwnProps) => {
	const { count, page, rowsPerPage, onPageChange } = props;
	return (
		<Box sx={{ flexShrink: 0, ml: 2.5 }}>
			<IconButton onClick={(e) => onPageChange(e, page - 1)} disabled={page === 0}>
				<ChevronLeftIcon />
			</IconButton>
			<IconButton
				onClick={(e) => onPageChange(e, page + 1)}
				disabled={page >= Math.ceil(count / rowsPerPage) - 1}
			>
				<ChevronRightIcon />
			</IconButton>
		</Box>
	);
};

type Props = {
  dealerId?: number | string | null;
  compact?: boolean;
};

const QuotationPage: React.FC<Props> = ({ dealerId }) => {
	const [quotes, setQuotes] = useState<Quote[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isError, setIsError] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(5);
	const [snackbarOpen, setSnackbarOpen] = useState(false);

	const navigate = useNavigate();

	async function fetchQuotes() {
		setIsLoading(true);
		setIsError(false);
		try {
			// ✅ build a relative path (client has baseURL '/api')
			const path = dealerId
				? `/quotestoorder/quotes_by_dealer/${dealerId}`
				: `/quotestoorder/quotes_dtls`;

			const res = await http.get(path);        // ✅ Authorization auto-attached
			const data = res.data;

			// ✅ normalize to array
			const arr: Quote[] = Array.isArray(data)
				? data
				: Array.isArray((data as any)?.quotes)
					? (data as any).quotes
					: [];

			setQuotes(arr);
			setSnackbarOpen(true);
			setPage(0);
		} catch (error) {
			console.error('Failed to fetch quotations:', error);
			setIsError(true);
			setQuotes([]);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		if (isAuthenticated()) { // NEW CHECK
			fetchQuotes();
		} else {
			console.warn("Not authenticated. Skipping quotation fetch."); // Optional: log a warning
			setIsLoading(false); // Ensure loading state is cleared
			setQuotes([]); // Clear any previous quotes
		}
	}, [dealerId, isAuthenticated]);

	const handleChangePage = (_event: unknown, newPage: number) => setPage(newPage);

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	const renderStatusChip = (status: Quote['status']) => {
		switch (status) {
		case 'accepted':
			return <Chip icon={<CheckCircleIcon />} label="Accepted" color="success" variant="outlined" size="small" />;
		case 'rejected':
			return <Chip icon={<CancelIcon />} label="Rejected" color="error" variant="outlined" size="small" />;
		case 'sent':
			return <Chip icon={<SendIcon />} label="Sent" color="warning" variant="outlined" size="small" />;
		default:
			return <Chip icon={<DraftsIcon />} label="Draft" color="warning" variant="outlined" size="small" />;
		}
	};

	const start = page * rowsPerPage;
	const end = start + rowsPerPage;
	const paginatedQuotes = quotes.slice(start, end);

	return (
		<Box sx={{ background: '#f5f7fa', minHeight: '100vh', padding: 4 }}>
			<Paper elevation={3} sx={{ maxWidth: '100%', margin: '0 auto', borderRadius: 3, overflow: 'hidden' }}>
				<Grid
					container
					alignItems="center"
					justifyContent="center"
					sx={{
						background: 'linear-gradient(90deg, #3f51b5 0%, #2196f3 100%)',
						color: 'white',
						padding: '16px 24px',
						position: 'relative',
					}}
				>
					<Button
						variant="contained"
						startIcon={<RefreshIcon />}
						onClick={fetchQuotes}
						sx={{ backgroundColor: 'white', color: '#3f51b5', 
							textTransform: 'none', fontWeight: 'bold', position: 'absolute', left: 24 }}
					>
						Refresh
					</Button>
					<Typography variant="h4" sx={{ fontWeight: 400, textAlign: 'center', 
						display: 'flex', alignItems: 'center', gap: 1 }}>
						Quotation List
					</Typography>
				</Grid>

				<Box sx={{ padding: 3 }}>
					{isLoading && <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 2 }} />}
					{isError && <Alert severity="error">Error loading quotations</Alert>}

					{!isLoading && !isError && (
						<TableContainer>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Quote ID</TableCell>
										<TableCell>Dealer</TableCell>
										<TableCell>Date Created</TableCell>
										<TableCell>Total Price</TableCell>
										<TableCell>Status</TableCell>
										<TableCell>View</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{paginatedQuotes.map((quote) => (
										<TableRow key={quote.quote_id}>
											<TableCell>{quote.quote_id}</TableCell>
											<TableCell>{quote.dealer_id ?? 'Unassigned'}</TableCell>
											<TableCell>{new Date(quote.date_created).toLocaleDateString()}</TableCell>
											<TableCell>₹{Number(quote.total_price).toFixed(2)}</TableCell>
											<TableCell>{renderStatusChip(quote.status)}</TableCell>
											<TableCell>
												<IconButton color="primary" onClick={() => 
													navigate(`/quotation-items/${quote.quote_id}`)}>
													<VisibilityIcon />
												</IconButton>
											</TableCell>
										</TableRow>
									))}
									{quotes.length === 0 && (
										<TableRow>
											<TableCell colSpan={6} align="center">
												No quotations found.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</TableContainer>
					)}

					<TablePagination
						rowsPerPageOptions={[5, 10, 25]}
						component="div"
						count={quotes.length}
						rowsPerPage={rowsPerPage}
						page={page}
						onPageChange={handleChangePage}
						onRowsPerPageChange={handleChangeRowsPerPage}
						ActionsComponent={CustomPaginationActions}
						sx={{ mt: 2 }}
					/>
				</Box>
			</Paper>

			<Snackbar
				open={snackbarOpen}
				autoHideDuration={2000}
				onClose={() => setSnackbarOpen(false)}
				message="Quotation list refreshed"
			/>
		</Box>
	);
};

export default QuotationPage;
