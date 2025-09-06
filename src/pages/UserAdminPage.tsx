import {
	MaterialReactTable,
	type MRT_ColumnDef,
} from 'material-react-table';
import {
	Box,
	Button,
	Typography,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	Select,
	MenuItem,
	FormControlLabel,
	Checkbox,
} from '@mui/material';
import { useEffect, useState } from 'react';
import RoleAccessSubview from './roleAccesssubview';
import { http } from '../lib/http';

/** Types */
type User = {
	id: string | number;
	full_name: string;
	email: string;
	phone: string;
	role: string;
	icon_labels: string[];
	two_fa_enabled: boolean;
	can_regenerate_2fa: boolean;
};
const availableRoles = ['Admin', 'Employee', 'Customer'];

const UserManagementTable = () => {
	const [users, setUsers] = useState<User[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isError, setIsError] = useState(false);

	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [openDialog, setOpenDialog] = useState(false);
	const [fullName, setFullName] = useState('');
	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');
	const [selectedRole, setSelectedRole] = useState('');
	const [icons, setIcons] = useState<string[]>([]);
	const [selectedIcons, setSelectedIcons] = useState<string[]>([]);
	const [twoFaEnabled, setTwoFaEnabled] = useState(true);
	const [canRegenerate2FA, setCanRegenerate2FA] = useState(false);

	const fetchData = async () => {
		try {
			setIsLoading(true);
			const res = await http.get('/userMgmt/usersList');
			const data = res.data;
			const normalizedUsers = data.map((user: any) => ({
				...user,
				id: user.user_id?.toString() ?? user.id?.toString(),
				two_fa_enabled: user.two_fa_enabled === 1 || user.two_fa_enabled === true,
				can_regenerate_2fa: user.can_regenerate_2fa === 1 || user.can_regenerate_2fa === true,
			}));
			setUsers(normalizedUsers);
			setIsError(false);
		} catch (error) {
			console.error('Error fetching user data:', error);
			setIsError(true);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	const fetchRoleIcons = async (role: string) => {
		try {
			const response = await http.get(`/userMgmt/role-icons?role=${role}`);
			const data = response.data;
			setIcons(data);
		} catch (error) {
			console.error('Error fetching icons:', error);
			setIcons([]);
		}
	};

	const openCreateDialog = () => {
		setEditingUser(null);
		setFullName('');
		setEmail('');
		setPhone('');
		setSelectedRole('');
		setSelectedIcons([]);
		setTwoFaEnabled(true);
		setCanRegenerate2FA(false);
		setIcons([]);
		setOpenDialog(true);
	};

	const handleRoleChange = async (event: any) => {
		const role = event.target.value;
		setSelectedRole(role);
		await fetchRoleIcons(role);
		setSelectedIcons([]);
	};

	const handleIconToggle = (icon: string) => {
		setSelectedIcons((prev) =>
			prev.includes(icon)
				? prev.filter((i) => i !== icon)
				: [...prev, icon]
		);
	};

	

	

	const handleSave = async () => {
		const payload = {
			user_id: editingUser?.id,
			full_name: fullName,
			email,
			phone,
			role: selectedRole,
			icon_labels: selectedIcons,
			two_fa_enabled: twoFaEnabled,
			can_regenerate_2fa: canRegenerate2FA,
		};
		const url = editingUser ? 'updateUser' : 'CreateUser';
		const method = editingUser ? 'put' : 'post';

		try {
			await http[method](`/userMgmt/${url}`, payload);
			await fetchData();
			setOpenDialog(false);
		} catch (error) {
			console.error('Error saving user:', error);
		}
	};

	const columns: MRT_ColumnDef<User>[] = [
		{
			id: 'edit',
			header: 'Actions',
			Cell: ({ row }) => (
				<Button variant="outlined" size="small" onClick={async () => {
					setEditingUser(row.original);
					setFullName(row.original.full_name);
					setEmail(row.original.email);
					setPhone(row.original.phone);
					setSelectedRole(row.original.role);
					setTwoFaEnabled(row.original.two_fa_enabled);
					setCanRegenerate2FA(row.original.can_regenerate_2fa);
					setIcons([]);
					setSelectedIcons([]);
					try {
						const [iconsRes, accessRes] = await Promise.all([
							http.get(`/userMgmt/role-icons?role=${row.original.role}`),
							http.get(`/userMgmt/user-access?user_id=${row.original.id}`),
						]);
						const roleIcons = iconsRes.data;
						const userAccessIcons = accessRes.data;
						setIcons(roleIcons);
						setTimeout(() => {
							setSelectedIcons(userAccessIcons);
						}, 0);
					} catch (error) {
						console.error('Error fetching icons during edit:', error);
						setIcons([]);
						setSelectedIcons([]);
					}
					setOpenDialog(true);
				}}>
					Edit
				</Button>
			),
			enableColumnActions: false,
			enableSorting: false,
		},
		{
			id: 'viewAccess',
			header: 'Access',
			Cell: ({ row }) => (
				<Button
					variant="outlined"
					size="small"
					onClick={async () => {
						try {
							const response = await http.get(`/userMgmt/user-access?user_id=${row.original.id}`);
							const data = response.data;
							alert(`Access icons: ${data.join(', ')}`);
						} catch (err) {
							console.error('Failed to fetch access icons:', err);
						}
					}}
				>
					View Access
				</Button>
			),
		},
		{ accessorKey: 'full_name', header: 'Full Name' },
		{ accessorKey: 'email', header: 'Email' },
		{ accessorKey: 'phone', header: 'Phone' },
		{ accessorKey: 'role', header: 'Role' },
		{
			accessorKey: 'two_fa_enabled',
			header: '2FA Enabled',
			Cell: ({ row }) => (row.original.two_fa_enabled ? 'Yes' : 'No'),
		},
		{
			accessorKey: 'can_regenerate_2fa',
			header: 'Can Regenerate 2FA',
			Cell: ({ row }) => (row.original.can_regenerate_2fa ? 'Yes' : 'No'),
		},
	];

	return (
		<>
			<Typography variant="h5" sx={{ my: 2 }} textAlign="center">
				User Management
			</Typography>

			<MaterialReactTable
				enableRowActions={false}
				columns={columns}
				data={users}
				createDisplayMode="modal"
				editDisplayMode="modal"
				getRowId={(row) => row.id?.toString() ?? Math.random().toString()}
				onRowClick={() => {}}
				onCreatingRowSave={async () => {
					await handleSave();
				}}
				renderTopToolbarCustomActions={() => (
					<Button variant="contained" onClick={openCreateDialog}>
						Create New User
					</Button>
				)}
				state={{ isLoading, showAlertBanner: isError }}
			/>

			<Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
				<DialogTitle>{editingUser ? 'Edit User' : 'Create User'}</DialogTitle>
				<DialogContent>
					<TextField
						margin="dense"
						label="Full Name"
						fullWidth
						value={fullName}
						onChange={(e) => setFullName(e.target.value)}
					/>
					<TextField
						margin="dense"
						label="Email"
						fullWidth
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
					<TextField
						margin="dense"
						label="Phone"
						fullWidth
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
					/>
					<Select
						fullWidth
						value={selectedRole}
						onChange={handleRoleChange}
						displayEmpty
						style={{ marginTop: 16 }}
					>
						<MenuItem value="" disabled>Select Role</MenuItem>
						{availableRoles.map((role) => (
							<MenuItem key={role} value={role}>{role}</MenuItem>
						))}
					</Select>
					<Box sx={{ mt: 2 }}>
						{icons.map((icon) => (
							<FormControlLabel
								key={icon}
								control={
									<Checkbox
										checked={selectedIcons.includes(icon)}
										onChange={() => handleIconToggle(icon)}
										name={icon}
									/>
								}
								label={icon}
							/>
						))}
					</Box>
					<FormControlLabel
						control={
							<Checkbox
								checked={twoFaEnabled}
								onChange={(e) => setTwoFaEnabled(e.target.checked)}
								name="two_fa_enabled"
							/>
						}
						label="Enable 2FA"
					/>
					<FormControlLabel
						control={
							<Checkbox
								checked={canRegenerate2FA}
								onChange={(e) => setCanRegenerate2FA(e.target.checked)}
								name="can_regenerate_2fa"
							/>
						}
						label="Can Regenerate 2FA"
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpenDialog(false)}>Cancel</Button>
					<Button onClick={handleSave} variant="contained">
						{editingUser ? 'Update' : 'Create'}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default function UserManagementApp() {

	return (
		<>
			<Box>
				<UserManagementTable />
				<RoleAccessSubview />
			</Box>
		</>
	);
}
