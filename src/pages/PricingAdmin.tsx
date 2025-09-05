import React, { useEffect, useState, useMemo } from 'react';
import {
	MaterialReactTable,
	type MRT_ColumnDef,
	useMaterialReactTable,
} from 'material-react-table';
import { 
	Box, 
	Button, 
	TextField, 
	Typography,
	IconButton,
	Tooltip,
	Paper,
	useTheme,
	CircularProgress,
	Select,
	MenuItem,
} from '@mui/material';
import { 
	Add as AddIcon,
	Delete as DeleteIcon,
	Edit as EditIcon,
	Save as SaveIcon,
	Cancel as CancelIcon
} from '@mui/icons-material';
import TopAppBar from '../navBars/topAppBar';
import App from '../App';
import { useNavAccess } from '../navBars/navBars';
import { http } from '../lib/http';
import AddPricingModal from './AddPricingModal';
import EditPricingModal from './EditPricingModal';

type Pricing = {
  pricing_id: number;
  attribute_id: number;
  min_quantity: number;
  cost_price: number;
  price: number;
  attribute_name: string; 
  product_name?: string;
  condition_id?: number;
};

type AccountType = {
  account_type_id: number;
  account_type_name: string;
  category: 'Dealer' | 'Individual';
  min_margin_percent: number;
  max_margin_percent: number;
  description: string;
};

const PricingAdmin = () => {
	const theme = useTheme();
	const navItems = useNavAccess();
	const [pricingData, setPricingData] = useState<Pricing[]>([]);
	const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
	const [addPricingModalOpen, setAddPricingModalOpen] = useState(false);
	const [editPricingModalOpen, setEditPricingModalOpen] = useState(false);
	const [currentPricing, setCurrentPricing] = useState<any | null>(null);
	const [modalError, setModalError] = useState<string | null>(null); // New state for modal error

	useEffect(() => {
		fetchPricing();
		fetchAccountTypes();
	}, []);

	const fetchPricing = async () => {
		setIsLoading(true);
		try {
			const res = await http.get('/product-pricing');
			setPricingData(Array.isArray(res.data) ? res.data : []);
		} catch (err) {
			console.error('Failed to fetch pricing', err);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchAccountTypes = async () => {
		setIsLoading(true);
		try {
			const res = await http.get('/account-types');
			setAccountTypes(Array.isArray(res.data) ? res.data : []);
		} catch (err) {
			console.error('Failed to fetch account types', err);
		} finally {
			setIsLoading(false);
		}
	};

	const validateRequired = (value: any) => !!value;
	const validatePositiveNumber = (value: number) => value >= 0;

	const validatePricing = (pricing: Pricing) => {
		const errors: Record<string, string> = {};
		if (!validateRequired(pricing.min_quantity) || !validatePositiveNumber(pricing.min_quantity)) {
			errors.min_quantity = 'Minimum quantity must be a positive number';
		}
		if (!validateRequired(pricing.price) || !validatePositiveNumber(pricing.price)) {
			errors.price = 'Price must be a positive number';
		}
		if (!validateRequired(pricing.cost_price) || !validatePositiveNumber(pricing.cost_price)) {
			errors.cost_price = 'Cost price must be a positive number';
		}
		return errors;
	};

	const validateAccountType = (accountType: AccountType) => {
		const errors: Record<string, string> = {};
		if (!validateRequired(accountType.account_type_name)) {
			errors.account_type_name = 'Account type name is required';
		}
		if (!validateRequired(accountType.category)) {
			errors.category = 'Category is required';
		}
		if (!validateRequired(accountType.min_margin_percent) || 
			!validatePositiveNumber(accountType.min_margin_percent)) {
			errors.min_margin_percent = 'Minimum margin must be a positive number';
		}
		if (!validateRequired(accountType.max_margin_percent) || 
			!validatePositiveNumber(accountType.max_margin_percent)) {
			errors.max_margin_percent = 'Maximum margin must be a positive number';
		}
		return errors;
	};

	const handleCreatePricing = async ({ values, table }) => {
		const errors = validatePricing(values);
		if (Object.keys(errors).length > 0) {
			setValidationErrors(errors);
			return;
		}
		try {
			setIsLoading(true);
			await http.post('/product-pricing', values);
      
			await fetchPricing();
			table.setCreatingRow(null);
			setValidationErrors({});
		} catch (err) {
			console.error('Create failed', err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleUpdatePricing = async ({ values, exitEditingMode }) => {
		const errors = validatePricing(values);
		if (Object.keys(errors).length > 0) {
			setValidationErrors(errors);
			return;
		}
		try {
			setIsLoading(true);
			await http.put(`/product-pricing/${values.pricing_id}`, values);
			await fetchPricing();
			exitEditingMode();
			setValidationErrors({});
		} catch (err) {
			console.error('Update failed', err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleDeletePricing = async (row: Pricing) => {
		if (window.confirm(`Are you sure you want to delete pricing ID ${row.pricing_id}?`)) {
			try {
				setIsLoading(true);
				await http.delete(`/product-pricing/${row.pricing_id}`);
				await fetchPricing();
			} catch (err) {
				console.error('Delete failed', err);
			} finally {
				setIsLoading(false);
			}
		}
	};

	const handleCreateAccountType = async ({ values, table }) => {
		const errors = validateAccountType(values);
		if (Object.keys(errors).length > 0) {
			setValidationErrors(errors);
			return;
		}
		try {
			setIsLoading(true);
			await http.post('/account-types', values);
      
			await fetchAccountTypes();
			table.setCreatingRow(null);
			setValidationErrors({});
		} catch (err) {
			console.error('Create failed', err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleUpdateAccountType = async ({ row, exitEditingMode }) => {
		const updatedAccountType = accountTypes[row.index];
		const errors = validateAccountType(updatedAccountType);
		if (Object.keys(errors).length > 0) {
			setValidationErrors(errors);
			return;
		}
		try {
			setIsLoading(true);
			await http.put(`/account-types/${row.original.account_type_id}`, updatedAccountType);
			await fetchAccountTypes();
			exitEditingMode();
			setValidationErrors({});
		} catch (err) {
			console.error('Update failed', err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleDeleteAccountType = async (row: AccountType) => {
		if (window.confirm(`Are you sure you want to delete account type ${row.account_type_name}?`)) {
			try {
				setIsLoading(true);
				await http.delete(`/account-types/${row.account_type_id}`);
				await fetchAccountTypes();
			} catch (err) {
				console.error('Delete failed', err);
			} finally {
				setIsLoading(false);
			}
		}
	};

	const pricingColumns: MRT_ColumnDef<Pricing>[] = [
		
		{
			accessorKey: 'condition_id',
			header: 'Condition',
			size: 150,
			Cell: ({ row }) => (
				<Typography variant="body2">{row.original.condition_id ?? ''}</Typography>
			),
			Edit: ({ cell }) => (
				<TextField size="small" value={cell.getValue() || ''} disabled fullWidth />
			),
		},
		{
			accessorKey: 'product_name',
			header: 'Product',
			size: 200,
			Cell: ({ row }) => (
				<Typography variant="body2">{row.original.product_name ?? ''}</Typography>
			),
			Edit: ({ cell }) => (
				<TextField size="small" value={cell.getValue() || ''} disabled fullWidth />
			),
		},
		
		{
			accessorKey: 'attribute_name',
			header: 'Attribute',
			size: 250,
			Cell: ({ row }) => <Typography variant="body2">{row.original.attribute_name}</Typography>,
			Edit: ({ cell }) => (
				<TextField
					size="small"
					value={cell.getValue() || ''}
					disabled
					fullWidth
				/>
			),
		},
		{
			accessorKey: 'min_quantity',
			header: 'Min Qty',
			size: 150,
			Edit: ({ cell, row, table }) => (
				<TextField
					size="small"
					type="number"
					value={cell.getValue() || ''}
					onChange={(e) =>
						table.options.meta?.updateData(row.index, 'min_quantity', Number(e.target.value))
					}
					fullWidth
					error={!!validationErrors.min_quantity}
					helperText={validationErrors.min_quantity}
				/>
			),
		},
		{
			accessorKey: 'cost_price',
			header: 'Cost Price',
			size: 120,
			Edit: ({ cell, row, table }) => (
				<TextField
					size="small"
					type="number"
					value={cell.getValue() || ''}
					onChange={(e) =>
						table.options.meta?.updateData(row.index, 'cost_price', Number(e.target.value))
					}
					fullWidth
					error={!!validationErrors.cost_price}
					helperText={validationErrors.cost_price}
				/>
			),
		},
		{
			accessorKey: 'price',
			header: 'Price',
			size: 120,
			Edit: ({ cell, row, table }) => (
				<TextField
					size="small"
					type="number"
					value={cell.getValue() || ''}
					onChange={(e) =>
						table.options.meta?.updateData(row.index, 'price', Number(e.target.value))
					}
					fullWidth
					error={!!validationErrors.price}
					helperText={validationErrors.price}
				/>
			),
		},
		{
			id: 'actions',
			header: 'Actions',
			size: 120,
			Cell: ({ row, table }) => (
				<Box sx={{ display: 'flex', gap: '8px' }}>
					{table.getState().editingRow?.id === row.id ? (
						<>
							<Tooltip title="Save">
								<IconButton onClick={() => table.options.meta?.saveRow(row)}>
									<SaveIcon color="primary" />
								</IconButton>
							</Tooltip>
							<Tooltip title="Cancel">
								<IconButton onClick={() => table.setEditingRow(null)}>
									<CancelIcon color="error" />
								</IconButton>
							</Tooltip>
						</>
					) : (
						<>
							<Tooltip title="Edit">
								<IconButton onClick={() => { setCurrentPricing(row.original); 
									setEditPricingModalOpen(true); }}>
									<EditIcon color="primary" />
								</IconButton>
							</Tooltip>
							<Tooltip title="Delete">
								<IconButton onClick={() => handleDeletePricing(row.original)}>
									<DeleteIcon color="error" />
								</IconButton>
							</Tooltip>
						</>
					)}
				</Box>
			),
		},
	];

	const accountTypeColumns = useMemo<MRT_ColumnDef<AccountType>[]>(() => [
		{
			accessorKey: 'account_type_name',
			header: 'Account Type Name',
			size: 200,
			Edit: ({ cell, row, table }) => {
				const [value, setValue] = useState(cell.getValue() || '');
				return (
					<TextField
						size="small"
						value={value}
						onChange={(e) => {
							setValue(e.target.value);
							table.options.meta?.updateData(row.index, 'account_type_name', e.target.value);
						}}
						fullWidth
						error={!!validationErrors.account_type_name}
						helperText={validationErrors.account_type_name}
					/>
				);
			},
		},
		{
			accessorKey: 'category',
			header: 'Category',
			size: 150,
			Edit: ({ row, table }) => (
				<Select
					value={accountTypes[row.index]?.category || ''}
					onChange={(e) => {
						const newValue = e.target.value;
						table.options.meta?.updateData(row.index, 'category', newValue);
					}}
					fullWidth
				>
					<MenuItem value="Dealer">Dealer</MenuItem>
					<MenuItem value="Individual">Individual</MenuItem>
				</Select>
			),
		},
		{
			accessorKey: 'min_margin_percent',
			header: 'Min Margin (%)',
			size: 150,
			Cell: ({ cell }) => `${cell.getValue()}%`,
			Edit: ({ cell, row, table }) => {
				const [value, setValue] = useState(cell.getValue() || '');
				return (
					<TextField
						size="small"
						type="number"
						value={value}
						onChange={(e) => {
							setValue(e.target.value);
							table.options.meta?.updateData(row.index, 'min_margin_percent', Number(e.target.value));
						}}
						fullWidth
						error={!!validationErrors.min_margin_percent}
						helperText={validationErrors.min_margin_percent}
					/>
				);
			},
		},
		{
			accessorKey: 'max_margin_percent',
			header: 'Max Margin (%)',
			size: 150,
			Cell: ({ cell }) => `${cell.getValue()}%`,
			Edit: ({ cell, row, table }) => {
				const [value, setValue] = useState(cell.getValue() || '');
				return (
					<TextField
						size="small"
						type="number"
						value={value}
						onChange={(e) => {
							setValue(e.target.value);
							table.options.meta?.updateData(row.index, 'max_margin_percent', Number(e.target.value));
						}}
						fullWidth
						error={!!validationErrors.max_margin_percent}
						helperText={validationErrors.max_margin_percent}
					/>
				);
			},
		},
		{
			accessorKey: 'description',
			header: 'Description',
			size: 300,
			Edit: ({ cell, row, table }) => {
				const [value, setValue] = useState(cell.getValue() || '');
				return (
					<TextField
						size="small"
						multiline
						rows={3}
						value={value}
						onChange={(e) => {
							setValue(e.target.value);
							table.options.meta?.updateData(row.index, 'description', e.target.value);
						}}
						fullWidth
					/>
				);
			},
		},
	], [validationErrors, accountTypes]);

	const pricingTable = useMaterialReactTable({
		columns: pricingColumns,
		data: pricingData,
		enableEditing: true,
		createDisplayMode: 'modal',
		editDisplayMode: 'modal',
		enableColumnResizing: true,
		enableGrouping: true,  // ✅ Turn on row grouping
		autoResetPageIndex: false,
		 initialState: {
			grouping: ['condition_id','product_name'],
			expanded: true,
		},
		layoutMode: 'grid',
		getRowId: (row) => String(row.pricing_id),
		onCreatingRowSave: handleCreatePricing,
		onEditingRowSave: handleUpdatePricing,
		state: { isLoading },
		muiTablePaperProps: {
			elevation: 4,
			sx: { borderRadius: theme.shape.borderRadius, overflow: 'hidden' },
		},
		muiTableHeadCellProps: {
			sx: { fontWeight: 'bold', backgroundColor: theme.palette.grey[100], wordWrap: 'break-word' },
		},
		muiTableBodyCellProps: {
			sx: { borderRight: `1px solid ${theme.palette.divider}` },
		},
		renderTopToolbarCustomActions: () => (
			<Button
				variant="contained"
				startIcon={<AddIcon />}
				onClick={() => setAddPricingModalOpen(true)}
				sx={{ mr: 2 }}
				disabled={isLoading}
			>
				Add New Pricing
			</Button>
		),
		renderBottomToolbarCustomActions: () => (
			<Typography variant="body2" sx={{ p: 2 }}>
				{isLoading ? <CircularProgress size={20} /> : `Total: ${pricingData.length} pricing records`}
			</Typography>
		),
		meta: {
			updateData: (rowIndex, columnId, value) => {
				setPricingData((prev) =>
					prev.map((row, index) =>
						index === rowIndex ? { ...row, [columnId]: value } : row
					)
				);
			},
			saveRow: (row) => {
				pricingTable.options.onEditingRowSave?.({
					values: row.original,
					row,
					exitEditingMode: () => pricingTable.setEditingRow(null),
				});
			},
		},
	});

	const accountTypeTable = useMaterialReactTable({
		columns: accountTypeColumns,
		data: accountTypes,
		enableEditing: true,
		createDisplayMode: 'modal',
		editDisplayMode: 'modal',
		enableColumnResizing: true,
		getRowId: (row) => String(row.account_type_id),
		onCreatingRowSave: handleCreateAccountType,
		onEditingRowSave: handleUpdateAccountType,
		onEditingRowCancel: () => setValidationErrors({}),
		renderRowActions: ({ row, table }) => (
			<Box sx={{ display: 'flex', gap: '1rem' }}>
				<Tooltip title="Edit">
					<IconButton onClick={() => table.setEditingRow(row)}>
						<EditIcon />
					</IconButton>
				</Tooltip>
				<Tooltip title="Delete">
					<IconButton color="error" onClick={() => handleDeleteAccountType(row.original)}>
						<DeleteIcon />
					</IconButton>
				</Tooltip>
			</Box>
		),
		state: { isLoading },
		muiTablePaperProps: {
			elevation: 4,
			sx: { borderRadius: theme.shape.borderRadius, overflow: 'hidden' },
		},
		muiTableHeadCellProps: {
			sx: { fontWeight: 'bold', backgroundColor: theme.palette.grey[100], wordWrap: 'break-word' },
		},
		muiTableBodyCellProps: {
			sx: { borderRight: `1px solid ${theme.palette.divider}` },
		},
		renderTopToolbarCustomActions: () => (
			<Button
				variant="contained"
				startIcon={<AddIcon />}
				onClick={() => accountTypeTable.setCreatingRow(true)}
				sx={{ mr: 2 }}
				disabled={isLoading}
			>
				Add New Account Type
			</Button>
		),
		renderBottomToolbarCustomActions: () => (
			<Typography variant="body2" sx={{ p: 2 }}>
				{isLoading ? <CircularProgress size={20} /> : `Total: ${accountTypes.length} account types`}
			</Typography>
		),
		meta: {
			updateData: (rowIndex, columnId, value) => {
				setAccountTypes((prev) =>
					prev.map((row, index) =>
						index === rowIndex ? { ...row, [columnId]: value } : row
					)
				);
			},
		},
	});

	return (
		<>
			<TopAppBar navItems={navItems} />
			<Box sx={{ mt: 10, mb: 4, px: { xs: 2, sm: 3, md: 4 } }}>
				<Paper elevation={3} sx={{ p: 3, mb: 3, background: theme.palette.background.paper }}>
					<Typography variant="h5" 
						gutterBottom sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
						Account Type Management
					</Typography>
					<Typography variant="body1" color="text.secondary">
						Manage account types for dealers and individuals
					</Typography>
				</Paper>
				<MaterialReactTable table={accountTypeTable} />
				<Box sx={{ mt: 4 }}>
					<Paper elevation={3} sx={{ p: 3, mb: 3, background: theme.palette.background.paper }}>
						<Typography variant="h5" gutterBottom sx=
							{{ fontWeight: 'bold', color: theme.palette.primary.main }}>
							Product Pricing Management
						</Typography>
						<Typography variant="body1" color="text.secondary">
							Manage pricing rules for product attributes
						</Typography>
					</Paper>
					<MaterialReactTable table={pricingTable} />
				</Box>
				<AddPricingModal
					open={addPricingModalOpen}
					onClose={() => {
						setAddPricingModalOpen(false);
						setModalError(null); // Clear error when closing modal
					}}
					onSave={async (pricing) => {
						try {
							await http.post('/product-pricing', pricing);
              
							await fetchPricing();
							setAddPricingModalOpen(false);
							setModalError(null); // Clear error on success
						} catch (err) {
							const errorMessage = err instanceof Error ? err.message : String(err);
							setModalError(
								errorMessage.includes('already exists')
									? 'This product/attribute combination exists'
									: 'Failed to save pricing: ' + errorMessage
							);
						}
					}}
					error={modalError} // Pass error to modal
					clearError={() => setModalError(null)} // Pass error clearing function
				/>
				<EditPricingModal
					open={editPricingModalOpen}
					pricingData={currentPricing}
					onClose={() => setEditPricingModalOpen(false)}
					onSave={async (updatedPricing) => {
						await http.put(`/product-pricing/${updatedPricing.pricing_id}`, updatedPricing);
						await fetchPricing();
						setEditPricingModalOpen(false);
					}}
				/>
			</Box>
			<App />
		</>
	);
};

export default PricingAdmin;