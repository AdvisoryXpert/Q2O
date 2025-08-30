import React, { useEffect, useState } from 'react';
import {
	Box,
	Typography,
	TextField,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import API from '../apiConfig'; 
type RoleAccess = {
  id: number;
  role: string;
  icon_label: string;
};

const RoleAccessSubview = () => {
	const [data, setData] = useState<RoleAccess[]>([]);
	const [open, setOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<RoleAccess | null>(null);
	const [role, setRole] = useState('');
	const [iconLabel, setIconLabel] = useState('');
	const [showTable, setShowTable] = useState(false);

	const fetchData = async () => {
		const res = await fetch(`${API}/api/userMgmt/role-access`);
		const json = await res.json();
		setData(json);
	};

	useEffect(() => {
		if (showTable) {
			fetchData();
		}
	}, [showTable]);

	const handleSave = async () => {
		const method = editingItem ? 'PUT' : 'POST';
		const url = editingItem
			? `${API}/api/userMgmt/role-access/${editingItem.id}`
			: `${API}/api/userMgmt/role-access`;

		await fetch(url, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ role, icon_label: iconLabel }),
		});

		setOpen(false);
		setEditingItem(null);
		setRole('');
		setIconLabel('');
		fetchData();
	};

	const columns: MRT_ColumnDef<RoleAccess>[] = [
		{
			id: 'actions',
			header: 'Actions',
			Cell: ({ row }) => (
				<IconButton
					onClick={() => {
						setEditingItem(row.original);
						setRole(row.original.role);
						setIconLabel(row.original.icon_label);
						setOpen(true);
					}}
				>
					<EditIcon />
				</IconButton>
			),
		},
		{
			accessorKey: 'role',
			header: 'Role',
		},
		{
			accessorKey: 'icon_label',
			header: 'Icon Label',
		},
	];

	return (
		<Box sx={{ mt: 6 }}>
			<Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
				<Button
					variant="contained"
					startIcon={<AddIcon />}
					onClick={() => setShowTable(!showTable)}
				>
					Toggle Role Access Table
				</Button>
			</Box>

			{showTable && (
				<>
					<Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
						<Typography variant="h6" sx={{ mr: 2 }}>
							Role Access Seed Data
						</Typography>
						<Button
							variant="outlined"
							startIcon={<AddIcon />}
							onClick={() => {
								setEditingItem(null);
								setRole('');
								setIconLabel('');
								setOpen(true);
							}}
						>
							Add Access
						</Button>
					</Box>
					<MaterialReactTable columns={columns} data={data} />
				</>
			)}

			<Dialog open={open} onClose={() => setOpen(false)}>
				<DialogTitle>{editingItem ? 'Edit Access' : 'Add Access'}</DialogTitle>
				<DialogContent>
					<TextField
						margin="dense"
						label="Role"
						fullWidth
						value={role}
						onChange={(e) => setRole(e.target.value)}
					/>
					<TextField
						margin="dense"
						label="Icon Label"
						fullWidth
						value={iconLabel}
						onChange={(e) => setIconLabel(e.target.value)}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>Cancel</Button>
					<Button onClick={handleSave} variant="contained">
						{editingItem ? 'Update' : 'Create'}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default RoleAccessSubview;
