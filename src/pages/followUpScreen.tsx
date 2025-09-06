import React, { useEffect, useState } from 'react';
import {
	MaterialReactTable,
	type MRT_ColumnDef,
	useMaterialReactTable,
} from 'material-react-table';
import {
	Box,
	Typography,
	MenuItem,
	Select,
	TextField,
	Snackbar,
	Alert,
} from '@mui/material';
import { http } from '../lib/http';
import { useNavigate } from 'react-router-dom';

type FollowUp = {
  followup_id: string;
  entity_type: 'order' | 'quote' | 'sr';
  entity_id: string;
  invoice_id?: string; // Optional invoice_id for service requests
  lr_number?: string; // Optional lr_number for LR receipts
  assigned_to: number;
  created_by: number;
  status: 'Pending' | 'In Progress' | 'Completed';
  due_date: string | null;
  notes: string | null;
}

type User = {
  user_id: number;
  full_name: string;
}

const FollowUpScreen = () => {
	const [followups, setFollowups] = useState<FollowUp[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 6,
	});
	const [snackbarOpen, setSnackbarOpen] = useState(false);

	useEffect(() => {
		fetchFollowUps();
		fetchUsers();
	}, []);
	const statusStyles = {
		Completed: {
			backgroundColor: '#e8f5e9', // Light green
			'&:hover': {
				backgroundColor: '#c8e6c9', // Slightly darker green on hover
			},
		},
		Pending: {
			backgroundColor: '#fff8e1', // Light yellow
			'&:hover': {
				backgroundColor: '#ffecb3', // Slightly darker yellow on hover
			},
		},
		'In Progress': {
			backgroundColor: '#e3f2fd', // Light blue
			'&:hover': {
				backgroundColor: '#bbdefb', // Slightly darker blue on hover
			},
		},
	};

	const fetchFollowUps = async () => {
		const userRole = localStorage.getItem('userRole');
		const userId = localStorage.getItem('user_id');
		let url = `/followups?userRole=${userRole}`;
		if (userRole?.toLowerCase() === 'Employee'.toLowerCase()) {
			url = `/followups?userRole=${userRole}&userId=${userId}`;
		}
		const res = await http.get(url);
		setFollowups(res.data);
	};

	const fetchUsers = async () => {
		const res = await http.get('/userMgmt/usersList');
		setUsers(res.data);
	};

	const handleUpdate = async (values: FollowUp) => {
		const res = await http.put(`/followups/${values.followup_id}`, {
			status: values.status,
			assigned_to: values.assigned_to,
			due_date: values.due_date || null,
			notes: values.notes || null,
		});

		if (res.status === 200) {
			setSnackbarOpen(true);
		} else {
			console.error("Update failed");
		}
	};

	const navigate = useNavigate();
	const columns: MRT_ColumnDef<FollowUp>[] = [
		{
			accessorKey: 'followup_id',
			header: 'Follow-Up ID',
			Cell: ({ row }) => {
				const { entity_type, entity_id } = row.original;
				let path = '';
				if (entity_type === 'quote') {
					path = `/quotation-items/${entity_id}`;
				} else if (entity_type === 'sr') {
					path = `/serviceRequest/${entity_id}`;
				} else if (entity_type === 'lr') {
					path = `/lr-item?id=${entity_id}`;
				}

				return (
					<Typography
						variant="body2"
						component="a"
						href={path}
						onClick={(e) => {
							e.preventDefault();
							navigate(path);
						}}
						sx={{
							cursor: 'pointer',
							textDecoration: 'underline',
							color: 'primary.main',
							'&:hover': {
								color: 'primary.dark',
							},
						}}
					>
						{row.original.followup_id}
					</Typography>
				);
			},
		},
		{
			accessorKey: 'entity_type',
			header: 'Entity Type',
			Cell: ({ row }) => {
				const { entity_type } = row.original;
				return (
					<Typography variant="body2">
						{entity_type === 'order' ? 'lr' : entity_type}
					</Typography>
				);
			},
		},
		{
			accessorKey: 'entity_id',
			header: 'Related-ID',
			Cell: ({ row }) => {
				const { entity_type, entity_id, invoice_id, lr_number } = row.original;
				let displayId = entity_id;
				if (entity_type === 'sr' && invoice_id) {
					displayId = invoice_id;
				} else if ((entity_type === 'lr' || entity_type === 'order') && lr_number) {
					displayId = lr_number;
				}
				return <Typography variant="body2">{displayId}</Typography>;
			},
		},
		{
			accessorKey: 'assigned_to',
			header: 'Assigned To',
			Cell: ({ row }) => {
				const [isAdmin, setIsAdmin] = useState(false);

				useEffect(() => {
					const checkAdmin = async () => {
						const role = await getUserRole();
						setIsAdmin(role === 'Admin');
					};
					checkAdmin();
				}, []);

				return (
					<Select
						size="small"
						value={Number(row.original.assigned_to)}
						disabled={!isAdmin}
						onChange={(e) => {
							if (!isAdmin) {
								alert('⚠️ Only Admin can change assigned user!');
								return;
							}
							const updatedRow = {
								...row.original,
								assigned_to: Number(e.target.value),
							};
							setFollowups((prev) =>
								prev.map((fu) =>
									fu.followup_id === updatedRow.followup_id ? updatedRow : fu
								)
							);
						}}
						onBlur={() => handleUpdate(row.original)}
					>
						{users.map((user) => (
							<MenuItem key={user.user_id} value={user.user_id}>
								{user.full_name}
							</MenuItem>
						))}
					</Select>
				);
			},
		},
		{
			accessorKey: 'status',
			header: 'Status',
			Cell: ({ row }) => (
				<Select
					size="small"
					value={row.original.status}
					onChange={(e) => {
						const updatedRow = {
							...row.original,
							status: e.target.value as FollowUp['status'],
						};
						setFollowups((prev) =>
							prev.map((fu) =>
								fu.followup_id === updatedRow.followup_id ? updatedRow : fu
							)
						);
					}}
					onBlur={() => handleUpdate(row.original)}
				>
					<MenuItem value="Pending">Pending</MenuItem>
					<MenuItem value="In Progress">In Progress</MenuItem>
					<MenuItem value="Completed">Completed</MenuItem>
				</Select>
			),
		},
		{
			accessorKey: 'due_date',
			header: 'Due Date',
			Cell: ({ row }) => {
				const displayDate = row.original.due_date
					? row.original.due_date.slice(0, 10) // Ensure YYYY-MM-DD
					: '';
				return (
					<TextField
						size="small"
						type="date"
						value={displayDate}
						onChange={(e) => {
							const updatedRow = { ...row.original, due_date: e.target.value };
							setFollowups((prev) =>
								prev.map((fu) =>
									fu.followup_id === updatedRow.followup_id ? updatedRow : fu
								)
							);
						}}
						onBlur={() => handleUpdate(row.original)}
					/>
				);
			},
		},
		{
			accessorKey: 'notes',
			header: 'Notes',
			Cell: ({ row }) => (
				<TextField
					size="small"
					value={row.original.notes || ''}
					onChange={(e) => {
						const updatedRow = { ...row.original, notes: e.target.value };
						setFollowups((prev) =>
							prev.map((fu) =>
								fu.followup_id === updatedRow.followup_id ? updatedRow : fu
							)
						);
					}}
					onBlur={() => handleUpdate(row.original)}
				/>
			),
		},
	];

	const table = useMaterialReactTable({
		columns,
		data: followups,
		state: { pagination },
		onPaginationChange: setPagination,
		manualPagination: false,
		autoResetPageIndex: false,
		muiTableBodyRowProps: ({ row }) => ({
			sx: statusStyles[row.original.status as keyof typeof statusStyles],
		}),
	});

	return (
		<>
			<Box>
				<Typography variant="h5" align="center" gutterBottom>
					Follow-Up Tracker
				</Typography>
				<MaterialReactTable table={table} />
			</Box>
			<Snackbar
				open={snackbarOpen}
				autoHideDuration={3000}
				onClose={() => setSnackbarOpen(false)}
			>
				<Alert severity="success" onClose={() => setSnackbarOpen(false)}>
					Update saved successfully!
				</Alert>
			</Snackbar>
		</>
	);
};

export default FollowUpScreen;
