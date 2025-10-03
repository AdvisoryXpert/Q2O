// src/pages/ConsolidatedAdmin.tsx
import React, { useEffect, useState } from 'react';
import {
	MaterialReactTable,
	type MRT_ColumnDef,
	useMaterialReactTable,
	MRT_Row,
} from 'material-react-table';
import {
	Box,
	Typography,
	IconButton,
	Button,
	Tooltip,
	Paper,
	useTheme,
	useMediaQuery,
	Radio,
	Snackbar,
	Alert,
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import { httpMultipart } from '../lib/http-multipart';
import { http } from '../lib/http';
import { sendWhatsAppImage } from '../services/whatsappService';

type Condition = {
  condition_id: number;
  tds_min: number;
  tds_max: number;
  hardness_min: number;
  hardness_max: number;
};

type Product = {
  product_id: number;
  name: string;
  condition_id: number;
};

type Attribute = {
  attribute_id: number;
  product_id: number;
  name: string;
  warranty_period: number;
  selected?: boolean;
  image_url?: string;          // can be absolute or relative
  image_path?: string;         // optional local path
  specification_url?: string;  // can be absolute or relative
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://127.0.0.1:5000';
const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE_URL || API_BASE;

const resolveFileUrl = (u?: string) => {
	if (!u) return '';
	if (/^https?:\/\//i.test(u)) return u; // already absolute
	if (u.startsWith('/')) return `${API_BASE}${u}`;
	return `${API_BASE}/${u}`;
};

const resolvePublicUrl = (u?: string) => {
	if (!u) return '';
	if (/^https?:\/\//i.test(u)) return u;
	const path = u.startsWith('/') ? u : `/${u}`;
	return `${PUBLIC_BASE}${path}`;
};

const ConsolidatedAdmin = () => {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

	const [conditions, setConditions] = useState<Condition[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [attributes, setAttributes] = useState<Attribute[]>([]);

	const [selectedConditionId, setSelectedConditionId] = useState<number | null>(null);
	const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const [selectedFiles, setSelectedFiles] = useState<Record<number, File | null>>({});
	const [businessVertical, setBusinessVertical] = useState<string | null>(null);

	const [condSelection, setCondSelection] = useState<Record<string, boolean>>({});
	const [prodSelection, setProdSelection] = useState<Record<string, boolean>>({});
	const [attrSelection, setAttrSelection] = useState<Record<string, boolean>>({});

	const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

	// ----- Init -----
	useEffect(() => {
		fetchBusinessVertical();
		fetchConditions();
	}, []);

	const fetchBusinessVertical = async () => {
		try {
			const res = await http.get('/business-vertical');
			setBusinessVertical(res.data.business_vertical);
		} catch (err) {
			console.error('Failed to fetch business vertical', err);
		}
	};

	useEffect(() => {
		if (businessVertical === 'Generic') {
			fetchAllProducts();
		} else if (businessVertical === 'RO' && selectedConditionId) {
			fetchProducts(selectedConditionId);
		}
	}, [selectedConditionId, businessVertical]);

	// ----- Data fetchers -----
	const fetchAllProducts = async () => {
		try {
			setIsLoading(true);
			const res = await http.get('/products/all');
			setProducts(res.data);
			setAttributes([]);
			setSelectedProductId(null);
			setProdSelection({});
			setAttrSelection({});
		} catch (err) {
			console.error('Failed to load products', err);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchConditions = async () => {
		try {
			setIsLoading(true);
			const res = await http.get('/conditions');
			setConditions(res.data);
		} catch (err) {
			console.error('Failed to load conditions', err);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchProducts = async (condition_id: number) => {
		try {
			setIsLoading(true);
			const res = await http.get(`/products?condition_id=${condition_id}`);
			setProducts(res.data);
			setAttributes([]);
			setSelectedProductId(null);
			setProdSelection({});
			setAttrSelection({});
		} catch (err) {
			console.error('Failed to load products', err);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchAttributes = async (product_id: number) => {
		try {
			setIsLoading(true);
			const res = await http.get(`/product-attributes?product_id=${product_id}`);
			setAttributes(res.data);
			setAttrSelection({});
		} catch (err) {
			console.error('Failed to load attributes', err);
		} finally {
			setIsLoading(false);
		}
	};

	// ----- Deletes -----
	const handleDeleteCondition = async (row: MRT_Row<Condition>) => {
		if (window.confirm(`Are you sure you want to delete condition ${row.original.condition_id}?`)) {
			try {
				await http.delete(`/conditions/${row.original.condition_id}`);
				await fetchConditions();
				setSelectedConditionId(null);
				setCondSelection({});
				// Clear downstream
				setProducts([]);
				setAttributes([]);
				setSelectedProductId(null);
				setProdSelection({});
				setAttrSelection({});
			} catch (err) {
				console.error('Failed to delete condition', err);
			}
		}
	};

	const handleDeleteProduct = async (row: MRT_Row<Product>) => {
		if (window.confirm(`Are you sure you want to delete product ${row.original.name}?`)) {
			try {
				await http.delete(`/products/${row.original.product_id}`);
				if (selectedConditionId && businessVertical === 'RO') {
					await fetchProducts(selectedConditionId);
				} else {
					await fetchAllProducts();
				}
			} catch (err) {
				console.error('Failed to delete product', err);
			}
		}
	};

	const handleDeleteAttribute = async (row: MRT_Row<Attribute>) => {
		if (window.confirm(`Are you sure you want to delete attribute ${row.original.name}?`)) {
			try {
				await http.delete(`/product-attributes/${row.original.attribute_id}`);
				if (selectedProductId) await fetchAttributes(selectedProductId);
			} catch (err) {
				console.error('Failed to delete attribute', err);
			}
		}
	};

	// ----- Upload helpers -----
	const handleFileChange = (attribute_id: number, file: File | null) => {
		setSelectedFiles((prev) => ({ ...prev, [attribute_id]: file }));
	};

	const handleImageUpload = async (attribute_id: number) => {
		const file = selectedFiles[attribute_id];
		if (file) {
			const formData = new FormData();
			formData.append('image', file);

			try {
				await httpMultipart.post(`/product-attributes/${attribute_id}/upload-image`, formData);
				if (selectedProductId) fetchAttributes(selectedProductId);
			} catch (err) {
				console.error('Failed to upload image', err);
			}
		}
	};

	const handleSpecificationUpload = async (attribute_id: number) => {
		const file = selectedFiles[attribute_id];
		if (file) {
			const formData = new FormData();
			formData.append('specification', file);

			try {
				await httpMultipart.post(`/product-attributes/${attribute_id}/upload-specification`, formData);
				if (selectedProductId) fetchAttributes(selectedProductId);
			} catch (err) {
				console.error('Failed to upload specification', err);
			}
		}
	};

	// ----- Tables/Columns -----
	const conditionColumns: MRT_ColumnDef<Condition>[] = [
		{ accessorKey: 'condition_id', header: 'ID', enableEditing: false },
		{ accessorKey: 'tds_min', header: 'TDS Min' },
		{ accessorKey: 'tds_max', header: 'TDS Max' },
		{ accessorKey: 'hardness_min', header: 'Hardness Min' },
		{ accessorKey: 'hardness_max', header: 'Hardness Max' },
		{
			id: 'actions',
			header: 'Actions',
			Cell: ({ row }) => (
				<Tooltip title="Delete">
					<IconButton color="error" onClick={() => handleDeleteCondition(row)}>
						<DeleteIcon />
					</IconButton>
				</Tooltip>
			),
		},
	];

	const productColumns: MRT_ColumnDef<Product>[] = [
		{ accessorKey: 'product_id', header: 'ID', enableEditing: false },
		{ accessorKey: 'name', header: 'Name' },
		{
			id: 'actions',
			header: 'Actions',
			Cell: ({ row }) => (
				<Tooltip title="Delete">
					<IconButton color="error" onClick={() => handleDeleteProduct(row)}>
						<DeleteIcon />
					</IconButton>
				</Tooltip>
			),
		},
	];

	const attrColumns: MRT_ColumnDef<Attribute>[] = [
		{ accessorKey: 'attribute_id', header: 'ID', enableEditing: false },
		{ accessorKey: 'name', header: 'Name' },
		{ accessorKey: 'warranty_period', header: 'Warranty (Months)' },
		{
			header: 'Image',
			Cell: ({ row }) => (
				<>
					<input
						type="file"
						onChange={(e) =>
							handleFileChange(
								row.original.attribute_id,
								e.target.files ? e.target.files[0] : null
							)
						}
					/>
					<Button onClick={() => handleImageUpload(row.original.attribute_id)}>Upload</Button>
				</>
			),
		},
		{
			header: 'Uploaded Image',
			Cell: ({ row }) => {
				const fileUrl = resolveFileUrl(row.original.image_url);
				return fileUrl ? (
					<a href={fileUrl} target="_blank" rel="noopener noreferrer">
						<img src={fileUrl} alt="Product Attribute" width={100} />
					</a>
				) : null;
			},
		},
		{
			header: 'Product Specification',
			Cell: ({ row }) => (
				<>
					<input
						type="file"
						onChange={(e) =>
							handleFileChange(
								row.original.attribute_id,
								e.target.files ? e.target.files[0] : null
							)
						}
					/>
					<Button onClick={() => handleSpecificationUpload(row.original.attribute_id)}>
						Upload
					</Button>
				</>
			),
		},
		{
			header: 'View Specification',
			Cell: ({ row }) => {
				const specUrl = resolveFileUrl(row.original.specification_url);
				return specUrl ? (
					<a href={specUrl} target="_blank" rel="noopener noreferrer">
						{specUrl.split('/').pop()}
					</a>
				) : null;
			},
		},
		{
			header: 'WhatsApp',
			Cell: ({ row }) => (
				<>
					{/* Open WhatsApp Web with prefilled text + image URL */}
					<Tooltip title="Open in WhatsApp Web">
						<IconButton
							color="success"
							onClick={() => {
								const phone = prompt('Enter phone number');
								if (phone) {
									const product = products.find((p) => p.product_id === row.original.product_id);
									const text = `Product: ${product?.name}`;
									const imageUrl = row.original.image_url
										? `\nImage: ${resolvePublicUrl(row.original.image_url)}`
										: '';
									const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(
										text + imageUrl
									)}`;
									window.open(url, '_blank');
								}
							}}
						>
							<WhatsAppIcon />
						</IconButton>
					</Tooltip>

					{/* Send via API through backend (handles OAuth + delivery) */}
					<Tooltip title="Send via API">
						<IconButton
							color="primary"
							onClick={async () => {
								const raw = prompt('Enter phone number (with country code, no +)');
								if (!raw) return;
								const wa = raw.replace(/\D/g, '');
								const imageUrl = row.original.image_url ? resolvePublicUrl(row.original.image_url) : '';
								if (!imageUrl) {
									setSnackbar({ open: true, message: 'No public image available', severity: 'error' });
									return;
								}
								try {
									await sendWhatsAppImage(wa, `Product: ${row.original.name}`, imageUrl);
									setSnackbar({ open: true, message: 'WhatsApp image sent!', severity: 'success' });
								} catch (error: any) {
									setSnackbar({
										open: true,
										message: error?.message || 'Failed to send WhatsApp image',
										severity: 'error',
									});
								}
							}}
						>
							<AddAPhotoIcon />
						</IconButton>
					</Tooltip>
				</>
			),
		},
		{
			id: 'actions',
			header: 'Actions',
			Cell: ({ row }) => (
				<Tooltip title="Delete">
					<IconButton color="error" onClick={() => handleDeleteAttribute(row)}>
						<DeleteIcon />
					</IconButton>
				</Tooltip>
			),
		},
	];

	// ----- Tables -----
	const conditionTable = useMaterialReactTable({
		columns: conditionColumns,
		data: conditions,
		enableRowSelection: true,
		enableMultiRowSelection: false,
		getRowId: (row) => String(row.condition_id),
		// Radio instead of checkbox
		renderRowSelectionCheckbox: ({ row }) => (
			<Radio
				checked={row.getIsSelected()}
				onChange={() => row.toggleSelected()}
				inputProps={{ 'aria-label': `Select condition ${row.original.condition_id}` }}
			/>
		),
		state: { isLoading, rowSelection: condSelection },
		onRowSelectionChange: (updater) => {
			const newSel =
        typeof updater === 'function' ? updater(condSelection) : updater;
			setCondSelection(newSel);

			const key = Object.keys(newSel).find((k) => newSel[k]);
			const id = key ? Number(key) : null;

			// If selection changes, clear downstream selections/data (RO flow)
			if (id !== selectedConditionId) {
				setSelectedConditionId(id);
				setProdSelection({});
				setAttrSelection({});
				setSelectedProductId(null);
				setAttributes([]);
				if (businessVertical === 'RO' && id) fetchProducts(id);
				if (businessVertical === 'Generic') fetchAllProducts();
			}
		},
	});

	const productTable = useMaterialReactTable({
		columns: productColumns,
		data: products,
		enableRowSelection: true,
		enableMultiRowSelection: false,
		getRowId: (row) => String(row.product_id),
		renderRowSelectionCheckbox: ({ row }) => (
			<Radio
				checked={row.getIsSelected()}
				onChange={() => row.toggleSelected()}
				inputProps={{ 'aria-label': `Select product ${row.original.product_id}` }}
			/>
		),
		state: { isLoading, rowSelection: prodSelection },
		onRowSelectionChange: (updater) => {
			const newSel =
        typeof updater === 'function' ? updater(prodSelection) : updater;
			setProdSelection(newSel);

			const key = Object.keys(newSel).find((k) => newSel[k]);
			const id = key ? Number(key) : null;

			if (id !== selectedProductId) {
				setSelectedProductId(id);
				setAttrSelection({});
				setAttributes([]);
				if (id) fetchAttributes(id);
			}
		},
	});

	const attrTable = useMaterialReactTable({
		columns: attrColumns,
		data: attributes,
		editDisplayMode: 'modal',
		getRowId: (row) => String(row.attribute_id),
		enableRowSelection: true,
		enableMultiRowSelection: false,
		renderRowSelectionCheckbox: ({ row }) => (
			<Radio
				checked={row.getIsSelected()}
				onChange={() => row.toggleSelected()}
				inputProps={{ 'aria-label': `Select attribute ${row.original.attribute_id}` }}
			/>
		),
		state: { isLoading, rowSelection: attrSelection },
		onRowSelectionChange: (updater) => {
			const newSel =
        typeof updater === 'function' ? updater(attrSelection) : updater;
			setAttrSelection(newSel);
			// If you need selected attribute id in future, derive here similarly.
		},
		renderTopToolbarCustomActions: ({ table }) => (
			<Button
				variant="contained"
				startIcon={<AddIcon />}
				onClick={() => table.setCreatingRow(true)}
				disabled={!selectedProductId}
			>
				Create New Attribute
			</Button>
		),
		onCreatingRowSave: async ({ values, table }) => {
			if (!selectedProductId) return;
			try {
				await http.post('/product-attributes', { ...values, product_id: selectedProductId });
				await fetchAttributes(selectedProductId);
				table.setCreatingRow(null);
			} catch (err) {
				console.error('Failed to create attribute', err);
			}
		},
		onEditingRowSave: async ({ values, table }) => {
			try {
				await http.put(`/product-attributes/${values.attribute_id}`, values);
				if (selectedProductId) await fetchAttributes(selectedProductId);
				table.setEditingRow(null);
			} catch (err) {
				console.error('Failed to update attribute', err);
			}
		},
	});

	// ----- Layout -----
	return (
		<Paper
			sx={{
				position: 'fixed',
				left: isMobile ? 0 : 'var(--app-drawer-width, 240px)',
				top: 'var(--app-header-height, 56px)',
				right: 0,
				bottom: 0,
				display: 'flex',
				flexDirection: 'column',
				borderRadius: 2,
				boxShadow: 3,
				overflow: 'hidden',
			}}
		>
			{/* Scrollable content area */}
			<Box sx={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
				<Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 2 }}>
					{/* Conditions */}
					{businessVertical === 'RO' && (
						<Paper elevation={3} sx={{ p: 3, mb: 2, background: theme.palette.background.paper }}>
							<Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
								Water Conditions
							</Typography>
							<MaterialReactTable table={conditionTable} />
						</Paper>
					)}

					{/* Products */}
					{((businessVertical === 'RO' && selectedConditionId) || businessVertical === 'Generic') && (
						<Paper elevation={3} sx={{ p: 3, mb: 2, background: theme.palette.background.paper }}>
							<Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
								Products
							</Typography>
							<MaterialReactTable table={productTable} />
						</Paper>
					)}

					{/* Attributes (only when a product is selected) */}
					{selectedProductId && (
						<Paper elevation={3} sx={{ p: 3, mb: 2, background: theme.palette.background.paper }}>
							<Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
								Attributes
							</Typography>
							<MaterialReactTable table={attrTable} />
						</Paper>
					)}
				</Box>
			</Box>

			{/* Snackbar */}
			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={() => setSnackbar({ ...snackbar, open: false })}
			>
				<Alert
					severity={snackbar.severity}
					onClose={() => setSnackbar({ ...snackbar, open: false })}
					sx={{ width: '100%' }}
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Paper>
	);
};

export default ConsolidatedAdmin;
