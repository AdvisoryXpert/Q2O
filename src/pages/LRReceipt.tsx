import {
	MaterialReactTable,
	MRT_EditActionButtons,
	type MRT_ColumnDef,
	useMaterialReactTable,
} from "material-react-table";
import {
	Box,
	Button,
	DialogActions,
	DialogContent,
	DialogTitle,
	TextField,
	Typography,
	MenuItem,
} from "@mui/material";
import { useEffect, useState } from "react";
import { getUserId } from "../services/AuthService";
import { useSearchParams } from "react-router-dom";
import TopAppBar from "../navBars/topAppBar";
import App from "../App";
import { useNavAccess } from "../navBars/navBars";
import API from '../apiConfig'; 
type LRReceipt = {
	id: string;
	lr_number: string;
	product_name: string;
	manufacturer_name: string;
	description: string;
	status: string;
	executive: string;
	phone: string;
	file_path?: string;
	user_id?: string;
};

const LRTable = () => {
	const [receipts, setReceipts] = useState<LRReceipt[]>([]);
	const [filteredReceipts, setFilteredReceipts] = useState<LRReceipt[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isError, setIsError] = useState(false);
	const [searchText, setSearchText] = useState("");
	const [searchParams] = useSearchParams();
	const lrIdFromQuery = searchParams.get("id");
	

	const fetchData = async () => {
		try {
			setIsLoading(true);
			const res = await fetch(`${API}/api/lr-receipts`);
			if (!res.ok) throw new Error("Network response was not ok");
			const data = await res.json();
			setReceipts(data);

			// Filter by lr_id if present in URL
			if (lrIdFromQuery) {
				const filtered = data.filter((r: LRReceipt) => String(r.id) === String(lrIdFromQuery));
				setFilteredReceipts(filtered);
			  } else {
				setFilteredReceipts(data);
			  }
			  

			setIsError(false);
		} catch (error) {
			console.error("Error fetching data:", error);
			setIsError(true);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	useEffect(() => {
		if (!lrIdFromQuery) {
			const filtered = receipts.filter((r) =>
				r.lr_number.toLowerCase().includes(searchText.toLowerCase())
			);
			setFilteredReceipts(filtered);
		}
	}, [searchText, receipts, lrIdFromQuery]);

	const handleCreate = async (values: Partial<LRReceipt>, userId: string | null) => {
		if (!userId) {
			console.error("User ID not available. Cannot create record.");
			return false;
		}
		try {
			const payload = { ...values, user_id: userId };
			const response = await fetch(`${API}/api/lr-receipts`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!response.ok) throw new Error("Failed to create record");
			await fetchData();
			return true;
		} catch (error) {
			console.error("Error creating record:", error);
			return false;
		}
	};

	const handleUpdate = async (values: LRReceipt) => {
		const currentUserId = await getUserId();
		if (!currentUserId) {
			console.error("User ID not available. Cannot update record.");
			return false;
		}
		try {
			const payload = { ...values, user_id: currentUserId };
			const response = await fetch(`${API}/api/lr-receipts/${values.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!response.ok) throw new Error("Failed to update record");
			await fetchData();
			return true;
		} catch (error) {
			console.error("Error updating record:", error);
			return false;
		}
	};

	const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
		if (!e.target.files || e.target.files.length === 0) return;
	  
		const file = e.target.files[0];
		const formData = new FormData();
		formData.append("file", file); // ✅ Field name must match backend
	  
		try {
		  const response = await fetch(`${API}/api/lr-receipts/${id}/attachment`, {
				method: "PUT",
				body: formData,
			// ❗ DO NOT set Content-Type manually
		  });
	  
		  if (!response.ok) throw new Error("Upload failed");
	  
		  await fetchData(); // ✅ Refresh the table
		} catch (error) {
		  console.error("Error uploading file:", error);
		}
	  };

	const columns: MRT_ColumnDef<LRReceipt>[] = [
		{ accessorKey: "id", header: "LR ID", enableEditing: false, enableHiding: true , 
			enableColumnFilter: false, enableSorting: false, size:0},
		{ accessorKey: "lr_number", header: "LR Number" },
		{ accessorKey: "product_name", header: "Product Name" },
		{ accessorKey: "manufacturer_name", header: "Manufacturer Name" },
		{ accessorKey: "description", header: "Description" },
		{
			accessorKey: "status",
			header: "Status",
			muiEditTextFieldProps: {
				select: true,
				children: ["Open", "Closed", "Pending"].map((status) => (
					<MenuItem key={status} value={status}>
						{status}
					</MenuItem>
				)),
			},
		},
		{ accessorKey: "executive", header: "Executive" },
		{ accessorKey: "phone", header: "Phone" },
		{
			accessorKey: "upload",
			header: "Upload Attachment",
			Cell: ({ row }) => (
				<>
					<input
						type="file"
						accept=".pdf, .jpg, .jpeg, .png"
						style={{ display: "none" }}
						id={`upload-${row.original.id}`}
						onChange={(e) => handleUpload(e, row.original.id)}
					/>
					<label htmlFor={`upload-${row.original.id}`}>
						<Button variant="outlined" size="small" component="span">
							Upload
						</Button>
					</label>
				</>
			),
			enableEditing: false,
		},
		{
			accessorKey: "file_path",
			header: "Attachment",
			Cell: ({ cell }) =>
				cell.getValue() ? (
					<a
						href={`${API}/uploads/lr-receipts/${cell.getValue()}`}
						target="_blank"
						rel="noopener noreferrer"
					>
						View
					</a>
				) : (
					<span>No file</span>
				),
			enableEditing: false,
		},
	];

	const table = useMaterialReactTable({
		columns,
		data: filteredReceipts,
		initialState: {
			columnVisibility: { id: false },
		},
		createDisplayMode: "modal",
		editDisplayMode: "modal",
		enableEditing: true,
		getRowId: (row) => String(row.id),
		onCreatingRowSave: async ({ values, table }) => {
			const currentUserId = await getUserId();
			const success = await handleCreate(values, currentUserId);
			if (success) table.setCreatingRow(null);
		},
		onEditingRowSave: async ({ values, row, table }) => {
			const currentUserId = await getUserId();
			const updatedValues = { ...values, id: row.original.id };
			const success = await handleUpdate(updatedValues, currentUserId);
			if (success) table.setEditingRow(null);
		},
		renderCreateRowDialogContent: ({ table, row, internalEditComponents }) => (
			<>
				<DialogTitle>Create LR Receipt</DialogTitle>
				<DialogContent sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
					{internalEditComponents}
				</DialogContent>
				<DialogActions>
					<MRT_EditActionButtons variant="text" table={table} row={row} />
				</DialogActions>
			</>
		),
		renderEditRowDialogContent: ({ table, row, internalEditComponents }) => (
			<>
				<DialogTitle>Edit LR Receipt</DialogTitle>
				<DialogContent sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
					{internalEditComponents}
				</DialogContent>
				<DialogActions>
					<MRT_EditActionButtons variant="text" table={table} row={row} />
				</DialogActions>
			</>
		),
		renderTopToolbarCustomActions: ({ table }) => (
			<Box display="flex" gap={2} alignItems="center">
				<Button variant="contained" onClick={() => table.setCreatingRow(true)}>
					Create New LR Receipt
				</Button>
				{!lrIdFromQuery && (
					<TextField
						label="Search by LR Number"
						variant="outlined"
						size="small"
						value={searchText}
						onChange={(e) => setSearchText(e.target.value)}
					/>
				)}
			</Box>
		),
		state: {
			isLoading,
			showAlertBanner: isError,
		},
	});

	return (
		<>
			<Typography variant="h5" sx={{ my: 2 }} textAlign="center">
				LR Receipts Management
			</Typography>
			<MaterialReactTable table={table} />
		</>
	);
};

export default function LRReceiptApp() {
	const navItems = useNavAccess();

	return (
		<>
			<TopAppBar navItems={navItems} />
			<Box sx={{ mt: 10, mb: 10 }}>
				<LRTable />
			</Box>
			<App />
		</>
	);
}
