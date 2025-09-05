import React, { useEffect, useState, useRef } from 'react';
import {
	MaterialReactTable,
	type MRT_ColumnDef,
	useMaterialReactTable,
	MRT_Row,
} from 'material-react-table';
import { Box, Typography, IconButton, Button, Tooltip } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import TopAppBar from '../navBars/topAppBar';
import App from '../App';
import { useNavAccess } from '../navBars/navBars';
import { http } from '../lib/http';

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
  image_url?: string;
  specification_url?: string;
};

const ConsolidatedAdmin = () => {
	const navItems = useNavAccess();
	const [conditions, setConditions] = useState<Condition[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [attributes, setAttributes] = useState<Attribute[]>([]);
	const [selectedConditionId, setSelectedConditionId] = useState<number | null>(null);
	const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

	useEffect(() => {
		fetchConditions();
	}, []);

	useEffect(() => {
		if (selectedConditionId) {
			fetchProducts(selectedConditionId);
		}
	}, [selectedConditionId]);

	const fetchConditions = async () => {
		try {
			setIsLoading(true);
			const res = await http.get('/conditions');
			setConditions(res.data);
		} catch (err) {
			console.error("Failed to load conditions", err);
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
		} catch (err) {

			console.error("Failed to load products", err);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchAttributes = async (product_id: number) => {
		try {
			setIsLoading(true);
			const res = await http.get(`/product-attributes?product_id=${product_id}`);
			setAttributes(res.data);
		} catch (err) {
			console.error("Failed to load attributes", err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleDeleteCondition = async (row: MRT_Row<Condition>) => {
		if (window.confirm(`Are you sure you want to delete condition ${row.original.condition_id}?`)) {
			try {
				await http.delete(`/conditions/${row.original.condition_id}`);
				await fetchConditions();
				setSelectedConditionId(null);
			} catch (err) {
				console.error("Failed to delete condition", err);
			}
		}
	};

	const handleDeleteProduct = async (row: MRT_Row<Product>) => {
		if (window.confirm(`Are you sure you want to delete product ${row.original.name}?`)) {
			try {
				await http.delete(`/products/${row.original.product_id}`);
				if (selectedConditionId) await fetchProducts(selectedConditionId);
			} catch (err) {
				console.error("Failed to delete product", err);
			}
		}
	};

	const handleDeleteAttribute = async (row: MRT_Row<Attribute>) => {
		if (window.confirm(`Are you sure you want to delete attribute ${row.original.name}?`)) {
			try {
				await http.delete(`/product-attributes/${row.original.attribute_id}`);
				if (selectedProductId) await fetchAttributes(selectedProductId);
			} catch (err) {
				console.error("Failed to delete attribute", err);
			}
		}
	};

	const handleImageUpload = async (attribute_id: number) => {
		const fileInput = fileInputRefs.current[attribute_id];
		if (fileInput?.files?.length) {
			const file = fileInput.files[0];
			const formData = new FormData();
			formData.append('image', file);

			try {
				await http.post(`/product-attributes/${attribute_id}/upload-image`, formData);
				if (selectedProductId) fetchAttributes(selectedProductId);
			} catch (err) {
				console.error("Failed to upload image", err);
			}
		}
	};

	const handleSpecificationUpload = async (attribute_id: number) => {
		const fileInput = fileInputRefs.current[attribute_id];
		if (fileInput?.files?.length) {
			const file = fileInput.files[0];
			const formData = new FormData();
			formData.append('specification', file);

			try {
				await http.post(`/product-attributes/${attribute_id}/upload-specification`, formData);
				if (selectedProductId) fetchAttributes(selectedProductId);
			} catch (err) {
				console.error("Failed to upload specification", err);
			}
		}
	};

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
			)
		}
	];

	const attrColumns: MRT_ColumnDef<Attribute>[] = [
		{ accessorKey: 'attribute_id', header: 'ID', enableEditing: false },
		{ accessorKey: 'name', header: 'Name' },
		{ accessorKey: 'warranty_period', header: 'Warranty (Months)' },
		{
			header: 'Image',
			Cell: ({ row }) => (
				<>
					<input type="file" ref={(el) => (fileInputRefs.current[row.original.attribute_id] = el)} />
					<Button onClick={() => handleImageUpload(row.original.attribute_id)}>Upload</Button>
				</>
			)
		},
		{
			header: 'Uploaded Image',
			Cell: ({ row }) => (
				<>
					{row.original.image_url && (
						<a href={row.original.image_url} target="_blank" rel="noopener noreferrer">
							<img src={row.original.image_url} alt="Product Attribute" width="100" />
						</a>
					)}
				</>
			)
		},
		{
			header: 'Product Specification',
			Cell: ({ row }) => (
				<>
					<input type="file" ref={(el) => (fileInputRefs.current[row.original.attribute_id] = el)} />
					<Button onClick={() => handleSpecificationUpload(row.original.attribute_id)}>Upload</Button>
				</>
			)
		},
		{
			header: 'View Specification',
			Cell: ({ row }) => (
				<>
					{row.original.specification_url && (
						<a href={row.original.specification_url} target="_blank" rel="noopener noreferrer">
							{row.original.specification_url.split('/').pop()}
						</a>
					)}
				</>
			)
		},
		{
			header: 'WhatsApp',
			Cell: ({ row }) => (
				<Tooltip title="Select Attribute">
					<IconButton
						color="success"
						onClick={() => {
							const phone = prompt("Enter phone number");
							if (phone) {
								const product = products.find(p => p.product_id === row.original.product_id);
								const c = conditions.find(c => c.condition_id === product?.condition_id);

								const text = `Product: ${product?.name}
								\nTDS: ${c?.tds_min}-${c?.tds_max}
								\nHardness: ${c?.hardness_min}-${c?.hardness_max}`;
								const imageUrl = row.original.image_url ? 
									`\nImage: ${row.original.image_url}` : '';
								const url = `https://web.whatsapp.com/send?phone=${phone}&text=
								${encodeURIComponent(text + imageUrl)}`;
								window.open(url, "_blank");
							}
						}}
					>
						<WhatsAppIcon />
					</IconButton>
				</Tooltip>
			)
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

	const conditionTable = useMaterialReactTable({
		columns: conditionColumns,
		data: conditions,
		enableRowSelection: true,
		enableMultiRowSelection: false,
		getRowId: (row) => String(row.condition_id),
		onRowSelectionChange: (updater) => {
			const newSelection = typeof updater === 'function' ? updater({}) : updater;
			const selectedKey = Object.keys(newSelection)[0];
			const selectedId = selectedKey ? Number(selectedKey) : null;
      
			setSelectedConditionId(selectedId);
			if (!selectedId) {
				setProducts([]);
				setAttributes([]);
				setSelectedProductId(null);
			}
		},
		initialState: {
			pagination: { pageSize: 10, pageIndex: 0 },
		},
		enablePagination: true,
		createDisplayMode: 'modal',
		editDisplayMode: 'modal',
		enableEditing: true,
		renderTopToolbarCustomActions: ({ table }) => (
			<Button
				variant="contained"
				startIcon={<AddIcon />}
				onClick={() => table.setCreatingRow(true)}
			>
				Create New Condition
			</Button>
		),
		onCreatingRowSave: async ({ values, table }) => {
			try {
				await http.post('/conditions', values);
				await fetchConditions();
				table.setCreatingRow(null);
			} catch (err) {
				console.error("Failed to create condition", err);
			}
		},
		onEditingRowSave: async ({ values,table }) => {
			try {
				await http.put(`/conditions/${values.condition_id}`, values);
				await fetchConditions();
				table.setEditingRow(null);
			} catch (err) {
				console.error("Failed to update condition", err);
			}
		},
		state: {
			isLoading,
			rowSelection: selectedConditionId ? { [selectedConditionId]: true } : {},
		},
		muiTableBodyRowProps: ({ row }) => ({
			sx: {
				backgroundColor: row.id === String(selectedConditionId) ? 'rgba(0, 0, 255, 0.1)' : undefined,
				'&:hover': {
					backgroundColor: 'rgba(0, 0, 0, 0.05)',
				},
			},
		}),
	});

	const productTable = useMaterialReactTable({
		columns: productColumns,
		data: products,
		enableRowSelection: true,
		enableMultiRowSelection: false,
		getRowId: (row) => String(row.product_id),
		onRowSelectionChange: (updater) => {
			const newSelection = typeof updater === 'function' ? updater({}) : updater;
			const selectedKey = Object.keys(newSelection)[0];
			const selectedId = selectedKey ? Number(selectedKey) : null;
      
			setSelectedProductId(selectedId);
			if (selectedId) {
				fetchAttributes(selectedId);
			} else {
				setAttributes([]);
			}
		},
		initialState: {
			pagination: { pageSize: 10, pageIndex: 0 },
		},
		enablePagination: true,
		createDisplayMode: 'modal',
		editDisplayMode: 'modal',
		enableEditing: true,
		autoResetPageIndex: false,
		renderTopToolbarCustomActions: ({ table }) => (
			<Button
				variant="contained"
				startIcon={<AddIcon />}
				onClick={() => table.setCreatingRow(true)}
				disabled={!selectedConditionId}
			>
				Create New Product
			</Button>
		),
		onCreatingRowSave: async ({ values, table }) => {
			if (!selectedConditionId) return;
			try {
				await http.post('/products', { ...values, condition_id: selectedConditionId });
				await fetchProducts(selectedConditionId);
				table.setCreatingRow(null);
			} catch (err) {
				console.error("Failed to create product", err);
			}
		},
		onEditingRowSave: async ({ values,table }) => {
			try {
				await http.put(`/products/${values.product_id}`, values);
				if (selectedConditionId) await fetchProducts(selectedConditionId);
				table.setEditingRow(null);
			} catch (err) {
				console.error("Failed to update product", err);
			}
		},
		state: {
			isLoading,
			rowSelection: selectedProductId ? { [selectedProductId]: true } : {},
		},
		muiTableBodyRowProps: ({ row }) => ({
			sx: {
				backgroundColor: row.id === String(selectedProductId) ? 'rgba(0, 0, 255, 0.1)' : undefined,
				'&:hover': {
					backgroundColor: 'rgba(0, 0, 0, 0.05)',
				},
			},
		}),
	});

	const attrTable = useMaterialReactTable({
		columns: attrColumns,
		data: attributes,
		initialState: {
			pagination: { pageSize: 10, pageIndex: 0 },
		},
		enablePagination: true,
		enableEditing: true,
		createDisplayMode: 'modal',
		editDisplayMode: 'modal',
		getRowId: (row) => String(row.attribute_id),
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
				console.error("Failed to create attribute", err);
			}
		},
		onEditingRowSave: async ({ values,table }) => {
			try {
				await http.put(`/product-attributes/${values.attribute_id}`, values);
				if (selectedProductId) await fetchAttributes(selectedProductId);
				table.setEditingRow(null);
			} catch (err) {
				console.error("Failed to update attribute", err);
			}
		},
		state: {
			isLoading,
		},
	});

	return (
		<>
			<TopAppBar navItems={navItems} />
			<Box sx={{ p: 2, mt: 8 }}>
				<Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
					Water Conditions
				</Typography>
				<MaterialReactTable table={conditionTable} />

				{selectedConditionId && (
					<>
						<Typography variant="h5" mt={4} gutterBottom sx={{ fontWeight: 'bold' }}>
							Products
						</Typography>
						<MaterialReactTable table={productTable} />
					</>
				)}

				{selectedProductId && (
					<>
						<Typography variant="h5" mt={4} gutterBottom sx={{ fontWeight: 'bold' }}>
							Product Attributes
						</Typography>
						<MaterialReactTable table={attrTable} />
					</>
				)}
			</Box>
			<App />
		</>
	);
};

export default ConsolidatedAdmin;
