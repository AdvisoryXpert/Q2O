//npx prettier --write ./src/pages/Contact.tsx
import { useMemo, useState } from "react";
import QuotationPage from "./QuotationPage";
import { Dialog, Typography } from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";

import {
	MRT_EditActionButtons,
	MaterialReactTable,
	type MRT_ColumnDef,
	type MRT_Row,
	type MRT_TableOptions,
	useMaterialReactTable,
} from "material-react-table";
import {
	Box,
	Button,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
	MenuItem,
	Tooltip,
} from "@mui/material";
import {
	QueryClient,
	QueryClientProvider,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import TopAppBar from "../navBars/topAppBar";
import App from "../App";
import { useNavAccess } from "../navBars/navBars";
import { http } from "../lib/http";

// Dealer Type
type Dealer = {
  dealer_id: string;
  full_name: string;
  location: string;
  email: string;
  phone: string;
  date_created: string;
  is_important?: boolean;
  dealer_type?: "Individual" | "Dealer";
  account_type?: "Default" | "OEM" | "Technician" | "End Customer" | "Wholeseller";
  gst_number?: string;
};

// DealerTable Component
const DealerTable = () => {
	const [validationErrors, setValidationErrors] = useState<
    Record<string, string | undefined>
  >({});
	const [quoteModalOpen, setQuoteModalOpen] = useState(false);
	const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);

	const handleOpenQuotes = (dealerId: string) => {
		setSelectedDealerId(dealerId);
		setQuoteModalOpen(true);
	};

	const columns = useMemo<MRT_ColumnDef<Dealer>[]>(
		() => [
			{
				accessorKey: "dealer_id",
				header: "ID",
				enableEditing: false,
				size: 80,
			},
			{
				accessorKey: "is_important",
				header: "Important",
				Cell: ({ cell }) => (cell.getValue<number>() === 1 ? "Yes" : "No"),
				muiEditTextFieldProps: {
					select: true,
					children: [1, 0].map((val) => (
						<MenuItem key={val} value={val}>
							{val === 1 ? "Yes" : "No"}
						</MenuItem>
					)),
				},
			},
			{
				accessorKey: "full_name",
				header: "Name",
				Cell: ({ row }) => {
					const dealer = row.original;
					return (
						<span>
							{dealer.full_name}
							{dealer.is_important ? " ⭐" : ""}
						</span>
					);
				},
			},
			{
				accessorKey: "location",
				header: "Location",
			},
			{
				accessorKey: "email",
				header: "Email",
				muiEditTextFieldProps: {
					type: "email",
					required: true,
					error: !!validationErrors?.email,
					helperText: validationErrors?.email,
					onFocus: () =>
						setValidationErrors({ ...validationErrors, email: undefined }),
				},
			},
			{
				accessorKey: "phone",
				header: "Phone",
			},
			{
				accessorKey: "gst_number",
				header: "GST Number",
				muiEditTextFieldProps: {
					placeholder: "Optional",
				},
			},
			{
				accessorKey: "dealer_type",
				header: "Type",
				muiEditTextFieldProps: {
					select: true,
					children: ["Individual", "Dealer"].map((val) => (
						<MenuItem key={val} value={val}>{val}</MenuItem>
					)),
				},
			},
			{
				accessorKey: "account_type",
				header: "Account Type",
				muiEditTextFieldProps: {
					select: true,
					children: ["Default", "OEM", "Technician", "End Customer", "Wholeseller"].map((val) => (
						<MenuItem key={val} value={val}>{val}</MenuItem>
					)),
				},
			},
			{
				accessorKey: "date_created",
				header: "Date Created",
				enableEditing: false,
			},
			{
				header: "Quotes Details",
				Cell: ({ row }) => (
					<Tooltip title="View Quotes">
						<IconButton
							color="primary"
							onClick={() => handleOpenQuotes(row.original.dealer_id)}
						>
							<VisibilityIcon />
						</IconButton>
					</Tooltip>
				),
				enableEditing: false,
			},
		],
		[validationErrors],
	);

	const { mutateAsync: createDealer } = useCreateDealer();
	const {
		data: fetchedDealers = [],
		isError,
		isLoading,
		isFetching,
	} = useGetDealers();
	const { mutateAsync: updateDealer } = useUpdateDealer();
	const { mutateAsync: deleteDealer } = useDeleteDealer();

	const handleCreate: MRT_TableOptions<Dealer>["onCreatingRowSave"] = async ({
		values,
		table,
	}) => {
		const newValidationErrors = validateDealer(values);
		if (Object.values(newValidationErrors).some(Boolean)) {
			setValidationErrors(newValidationErrors);
			return;
		}
		setValidationErrors({});

		const updatedValues = {
			...values,
			is_important: values.is_important === 1 || values.is_important === "1",
		};

		await createDealer(updatedValues);
		table.setCreatingRow(null);
	};

	const handleUpdate: MRT_TableOptions<Dealer>["onEditingRowSave"] = async ({
		values,
		table,
	}) => {
		const newValidationErrors = validateDealer(values);
		if (Object.values(newValidationErrors).some(Boolean)) {
			setValidationErrors(newValidationErrors);
			return;
		}
		setValidationErrors({});

		const updatedValues = {
			...values,
			is_important: values.is_important === 1 || values.is_important === "1",
		};

		await updateDealer(updatedValues as Dealer);
		table.setEditingRow(null);
	};

	const handleDelete = async (row: MRT_Row<Dealer>) => {
		try {
			const response = await http.get(`/dealers/${row.original.dealer_id}/quotations/count`);
			const data = response.data;

			if (data.quotationCount > 0) {
				window.alert("This dealer has existing quotations and cannot be deleted.");
				return;
			}

			if (
				window.confirm(
					`Are you sure you want to delete dealer "${row.original.full_name}"?`,
				)
			) {
				await deleteDealer(row.original.dealer_id);
			}
		} catch (error) {
			console.error("Error checking for quotations:", error);
			window.alert("An error occurred while trying to delete the dealer. Please try again.");
		}
	};
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
	return (
		<>
			<MaterialReactTable
				table={useMaterialReactTable({
					columns,
					data: fetchedDealers,
					createDisplayMode: "modal",
					editDisplayMode: "modal",
					enableEditing: true,
					getRowId: (row) => row.dealer_id,
					muiToolbarAlertBannerProps: isError
						? {
							color: "error",
							children: "Error loading dealers",
						}
						: undefined,
					muiTableContainerProps: { sx: { minHeight: "500px" } },
					onCreatingRowCancel: () => setValidationErrors({}),
					onCreatingRowSave: handleCreate,
					onEditingRowCancel: () => setValidationErrors({}),
					onEditingRowSave: handleUpdate,
					renderCreateRowDialogContent: ({
						table,
						row,
						internalEditComponents,
					}) => (
						<>
							<DialogTitle>Create Dealer</DialogTitle>
							<DialogContent
								sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}
							>
								{internalEditComponents}
							</DialogContent>
							<DialogActions>
								<MRT_EditActionButtons variant="text" table={table} row={row} />
							</DialogActions>
						</>
					),
					renderEditRowDialogContent: ({
						table,
						row,
						internalEditComponents,
					}) => (
						<>
							<DialogTitle>Edit Dealer</DialogTitle>
							<DialogContent
								sx={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
							>
								{internalEditComponents}
							</DialogContent>
							<DialogActions>
								<MRT_EditActionButtons variant="text" table={table} row={row} />
							</DialogActions>
						</>
					),
					renderRowActions: ({ row, table }) => (
						<Box sx={{ display: "flex", gap: "1rem" }}>
							<Tooltip title="Edit">
								<IconButton onClick={() => table.setEditingRow(row)}>
									<EditIcon />
								</IconButton>
							</Tooltip>
							<Tooltip title="Delete">
								<IconButton color="error" onClick={() => handleDelete(row)}>
									<DeleteIcon />
								</IconButton>
							</Tooltip>
						</Box>
					),
					renderTopToolbarCustomActions: ({ table }) => (
						<Button
							variant="contained"
							onClick={() => table.setCreatingRow(true)}
						>
							Create New Dealer
						</Button>
					),
					state: {
						isLoading,
						isSaving: false,
						showAlertBanner: isError,
						showProgressBars: isFetching,
						pagination, 
					},
					onPaginationChange: setPagination,
					autoResetPageIndex: false,
				})}
			/>
			<Dialog
				open={quoteModalOpen}
				onClose={() => setQuoteModalOpen(false)}
				fullWidth
				maxWidth="lg"
			>
				<DialogTitle
					sx={{
						bgcolor: 'primary.main',
						color: 'white',
						fontWeight: 'bold',
						fontSize: '1.25rem',
						textAlign: 'center',
						letterSpacing: 1,
					}}
				>
					Quotations for Dealer
				</DialogTitle>

				<DialogContent>
					{selectedDealerId ? (
						<QuotationPage dealerId={selectedDealerId} />
					) : (
						<Typography>No dealer selected</Typography>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setQuoteModalOpen(false)}>Close</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

function useGetDealers() {
	return useQuery<Dealer[]>({
		queryKey: ["dealers"],
		queryFn: async () => {
			const res = await http.get('/dealers');
			return res.data;
		},
		refetchOnWindowFocus: false,
	});
}

// Hook: CREATE Dealer
function useCreateDealer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (dealer: Partial<Dealer>) => {
			await http.post('/dealers', dealer);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["dealers"] });
		},
	});
}

// Hook: UPDATE Dealer
function useUpdateDealer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (dealer: Dealer) => {
			await http.put(`/dealers/${dealer.dealer_id}`, dealer);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["dealers"] });
		},
	});
}

// Hook: DELETE Dealer
function useDeleteDealer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (dealerId: string) => {
			await http.delete(`/dealers/${dealerId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["dealers"] });
		},
	});
}

// Validation logic
function validateDealer(dealer: Partial<Dealer>) {
	return {
		full_name: !dealer.full_name ? "Full name is required" : "",
		email: !validateEmail(dealer.email || "") ? "Invalid email" : "",
	};
}

function validateEmail(email: string) {
	return !!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
}

const queryClient = new QueryClient();

export default function DealerApp() {
	const navItems = useNavAccess();
	return (
		<QueryClientProvider client={queryClient}>
			<TopAppBar navItems={navItems} />
			<Box sx={{ mt: 10, mb: 10 }}>
				<DealerTable />
			</Box>
			<App />
		</QueryClientProvider>
	);
}
