import React, { useEffect, useState } from 'react';
import {
	Box,
	Typography,
	Button,
	MenuItem,
	Select,
	FormControl,
	TextField
} from '@mui/material';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { useSearchParams } from 'react-router-dom'; // ✅ Added this

import { http } from '../lib/http';
type Warranty = {
  warranty_id: number;
  serial_number: string;
  product_id: number;
  name: string;
  dealer_id: number;
  dealer_name: string;
  customer_name: string;
  start_date: string;
  end_date: string;
  warranty_period: number;
  status: 'Active' | 'Expired';
  invoice_id: string;
}

const WarrantyTablePage = () => {
	const [warranties, setWarranties] = useState<Warranty[]>([]);
	const [editingRowId, setEditingRowId] = useState<number | null>(null);
	const [statusDraft, setStatusDraft] = useState<'Active' | 'Expired'>('Active');
	const [searchText, setSearchText] = useState('');
	const [searchParams] = useSearchParams(); // ✅ For reading URL query

	const fetchWarranties = async () => {
		const res = await http.get('/warranty');
		setWarranties(res.data);
	};

	useEffect(() => {
		fetchWarranties();
	}, []);

	useEffect(() => {
		const serialFromURL = searchParams.get('serial_number');
		if (serialFromURL) {
			setSearchText(serialFromURL); // ✅ Set initial search filter
		}
	}, [searchParams]);

	const handleStatusUpdate = async (warranty_id: number) => {
		try {
			const res = await http.put(`/warranty/${warranty_id}`, { status: statusDraft });
			if (res.status === 200) { // Axios uses status, not res.ok
				setEditingRowId(null);
				fetchWarranties();
			}
		} catch (err) {
			console.error('Failed to update warranty status', err);
		}
	};

	const filteredWarranties = warranties.filter(w =>
		w.serial_number.toLowerCase().includes(searchText.toLowerCase())
	);

	const columns: MRT_ColumnDef<Warranty>[] = [
		{ accessorKey: 'serial_number', header: 'Serial Number' },
		{ accessorKey: 'invoice_id', header: 'Invoice ID' },
		{ accessorKey: 'product_id', header: 'Product ID' },
		{ accessorKey: 'name', header: 'Product' },
		{ accessorKey: 'dealer_name', header: 'Dealer' },
		{ accessorKey: 'customer_name', header: 'Customer' },
		{ accessorKey: 'start_date', header: 'Start Date' },
		{ accessorKey: 'end_date', header: 'End Date' },
		{ accessorKey: 'warranty_period', header: 'Warranty Period (months)' },
		{
			accessorKey: 'status',
			header: 'Status',
			Cell: ({ row }) =>
				editingRowId === row.original.warranty_id ? (
					<FormControl fullWidth size="small">
						<Select
							value={statusDraft}
							onChange={(e) => setStatusDraft(e.target.value as 'Active' | 'Expired')}
						>
							<MenuItem value="Active">Active</MenuItem>
							<MenuItem value="Expired">Expired</MenuItem>
						</Select>
					</FormControl>
				) : (
					row.original.status
				)
		},
		{
			header: 'Actions',
			Cell: ({ row }) =>
				editingRowId === row.original.warranty_id ? (
					<Button
						size="small"
						variant="contained"
						onClick={() => handleStatusUpdate(row.original.warranty_id)}
					>
						Save
					</Button>
				) : (
					<Button
						size="small"
						variant="outlined"
						onClick={() => {
							setEditingRowId(row.original.warranty_id);
							setStatusDraft(row.original.status);
						}}
					>
						Edit
					</Button>
				)
		}
	];

	return (
		<>
			<Box sx={{ p: 2 }}>
				<Typography variant="h5" mb={2}>
					Warranty Management
				</Typography>
				<TextField
					fullWidth
					label="Search by Serial Number"
					variant="outlined"
					value={searchText}
					onChange={(e) => setSearchText(e.target.value)}
					sx={{ mb: 2 }}
				/>
				<MaterialReactTable columns={columns} data={filteredWarranties} enableColumnResizing />
			</Box>
		</>
	);
};

export default WarrantyTablePage;
