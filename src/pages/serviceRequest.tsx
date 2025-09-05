import React, { useEffect, useState } from 'react';
import { getUserId } from '../services/AuthService';
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
	Button,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import TopAppBar from '../navBars/topAppBar';
import App from '../App';
import { useNavAccess } from '../navBars/navBars';
import { http } from '../lib/http';

type ServiceRequest = {
  id: string;
  order_id: string;
  dealer_id: string;
  status: string;
  user_id: string;
  invoice_id?: string;
  file_path?: string;
  filename?: string;
  notes?: string;
};

type Dealer = {
  dealer_id: string;
  full_name: string;
  phone?: string;
};

type OrderOption = {
  order_id: string;
  invoice_id: string;
  dealer_id: string;
};

const generateUniqueServiceId = () => `SR-${Date.now()}`;

const ServiceRequestTable = () => {
	const [requests, setRequests] = useState<ServiceRequest[]>([]);
	const [dealersMap, setDealersMap] = useState<Record<string, Dealer>>({});
	const [ordersMap, setOrdersMap] = useState<Record<string, OrderOption>>({});
	const [searchInvoice, setSearchInvoice] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [isError, setIsError] = useState(false);
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 6 });
	const { id } = useParams();

	useEffect(() => {
		fetchData();
		fetchDealers();
		fetchOrders();
	}, [id]);

	const fetchData = async () => {
		try {
			setIsLoading(true);
			const res = await http.get('/service-requests');
			const data = res.data;
			setRequests(id ? data.filter((r: ServiceRequest) => String(r.id) === String(id)) : data);
			setIsError(false);
		} catch (err) {
			console.error('Error fetching service requests:', err);
			setIsError(true);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchDealers = async () => {
		const res = await http.get('/dealers');
		const data = res.data;
		const map: Record<string, Dealer> = {};
		data.forEach((d: Dealer) => {
			map[d.dealer_id] = d;
		});
		setDealersMap(map);
	};

	const fetchOrders = async () => {
		const res = await http.get('/orders-basic');
		const data = res.data;
		const map: Record<string, OrderOption> = {};
		data.forEach((o: OrderOption) => {
			map[o.order_id] = o;
		});
		setOrdersMap(map);
	};

	const handleCreateFromInvoice = async () => {
		const match = Object.values(ordersMap).find(o => o.invoice_id === searchInvoice);
		if (!match) {
			alert('No order found with this invoice ID');
			return;
		}
		const serviceRequestId = generateUniqueServiceId();

		const payload = {
			id: serviceRequestId,
			order_id: match.order_id,
			dealer_id: match.dealer_id,
			invoice_id: match.invoice_id,
			status: 'Open',
			user_id: Number(await getUserId()),
		};

		try {
			await http.post('/service-requests', payload);

			await fetchOrders();
			await fetchDealers();
			await fetchData();
			setSearchInvoice('');
		} catch (error) {
			console.error('Error creating record from invoice:', error);
		}
	};

	const handleUpdate = async (values: ServiceRequest) => {
		console.log("Updating service request:", values);
		try {
			await http.put(`/service-requests/${values.id}`, values);
			await fetchData();
		} catch (err) {
			console.error('Error updating service request:', err);
		}
	};

	const handleUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
		serviceRequestId: string
	) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const formData = new FormData();
		formData.append('file', file);
		try {
			await http.post(`/service-requests/${serviceRequestId}/attachment`, formData);
			await fetchData();
		} catch (err) {
			console.error('Error uploading attachment:', err);
		}
	};

	const columns: MRT_ColumnDef<ServiceRequest>[] = [
		{ accessorKey: 'id', header: 'Service Req ID' },
		{ accessorKey: 'order_id', header: 'Order ID' },
		{
			accessorKey: 'dealer_id',
			header: 'Dealer',
			Cell: ({ cell }) => {
				const dealer = dealersMap[cell.getValue<string>()];
				return dealer ? `${dealer.full_name} (${dealer.phone ?? 'N/A'})` : cell.getValue();
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
						const updated = { ...row.original, status: e.target.value as ServiceRequest['status'] };
						setRequests((prev) =>
							prev.map((req) => (req.id === updated.id ? updated : req))
						);
						handleUpdate(updated);
					}}
				>
					<MenuItem value="Open">Open</MenuItem>
					<MenuItem value="In Progress">In Progress</MenuItem>
					<MenuItem value="Closed">Closed</MenuItem>
				</Select>
			),
		},
		{ accessorKey: 'invoice_id', header: 'Invoice ID' },
		{
			accessorKey: 'notes',
			header: 'Notes',
			Cell: ({ row }) => (
				<TextField
					size="small"
					placeholder="Add notes"
					value={row.original.notes || ''}
					onChange={(e) => {
						const updated = { ...row.original, notes: e.target.value };
						setRequests((prev) =>
							prev.map((req) => (req.id === updated.id ? updated : req))
						);
					}}
					onBlur={(e) => {
						const updated = { ...row.original, notes: e.target.value };
						handleUpdate(updated);
					}}
					fullWidth
				/>
			),
		},
		{
			accessorKey: 'file_path',
			header: 'Attachment',
			Cell: ({ row }) => (
				<Box display="flex" alignItems="center" gap={1}>
					<input
						type="file"
						onChange={(e) => handleUpload(e, row.original.id)}
					/>
					{row.original.filename && (
						<a
							href={`/uploads/lr-receipts/${row.original.file_path}`}
							target="_blank"
							rel="noopener noreferrer"
						>
							{row.original.filename}
						</a>
					)}
				</Box>
			),
		},
	];

	const table = useMaterialReactTable({
		columns,
		data: requests,
		state: { pagination, isLoading, showAlertBanner: isError },
		onPaginationChange: setPagination,
		getRowId: (row) => row.id,
		enablePagination: true,
	});

	return (
		<>
			<TopAppBar navItems={useNavAccess()} />
			<Box sx={{ mt: 10, mb: 10 }}>
				<Typography variant="h5" align="center" gutterBottom>
					Service Request Management
				</Typography>
				<Box display="flex" gap={2} mb={2}>
					<TextField
						size="small"
						label="Search Invoice ID"
						value={searchInvoice}
						onChange={(e) => setSearchInvoice(e.target.value)}
					/>
					<Button variant="outlined" onClick={handleCreateFromInvoice}>
						Create SR from Invoice
					</Button>
				</Box>
				<MaterialReactTable table={table} />
			</Box>
			<App />
		</>
	);
};

export default ServiceRequestTable;
