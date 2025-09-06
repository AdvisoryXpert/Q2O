// src/pages/LRReceipt.tsx
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
import { http } from "../lib/http";

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

const LRReceiptPage = () => {
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
			const { data } = await http.get<LRReceipt[]>("/lr-receipts");
			setReceipts(data);
			setFilteredReceipts(
				lrIdFromQuery ? data.filter((r) => String(r.id) === String(lrIdFromQuery)) : data
			);
			setIsError(false);
		} catch (e) {
			console.error("Error fetching data:", e);
			setIsError(true);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
		 
	}, [lrIdFromQuery]);

	useEffect(() => {
		if (!lrIdFromQuery) {
			const q = searchText.toLowerCase();
			setFilteredReceipts(
				receipts.filter((r) => r.lr_number?.toLowerCase().includes(q))
			);
		}
	}, [searchText, receipts, lrIdFromQuery]);

	const handleCreate = async (values: Partial<LRReceipt>, userId: string | null) => {
		if (!userId) return false;
		try {
			await http.post("/lr-receipts", { ...values, user_id: userId });
			await fetchData();
			return true;
		} catch (e) {
			console.error("Error creating record:", e);
			return false;
		}
	};

	const handleUpdate = async (values: LRReceipt) => {
		const currentUserId = getUserId();
		if (!currentUserId) return false;
		try {
			await http.put(`/lr-receipts/${values.id}`, { ...values, user_id: currentUserId });
			await fetchData();
			return true;
		} catch (e) {
			console.error("Error updating record:", e);
			return false;
		}
	};

	const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
		if (!e.target.files || e.target.files.length === 0) return;
		const file = e.target.files[0];
		const formData = new FormData();
		formData.append("file", file);
		try {
			await http.put(`/lr-receipts/${id}/attachment`, formData);
			await fetchData();
		} catch (e) {
			console.error("Error uploading file:", e);
		}
	};

	const columns: MRT_ColumnDef<LRReceipt>[] = [
		{ accessorKey: "id", header: "LR ID", enableEditing: false, enableHiding: true, enableColumnFilter: false, enableSorting: false, size: 0 },
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
						accept=".pdf,.jpg,.jpeg,.png"
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
						href={`/uploads/lr-receipts/${cell.getValue() as string}`}
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
		initialState: { columnVisibility: { id: false } },
		createDisplayMode: "modal",
		editDisplayMode: "modal",
		enableEditing: true,
		getRowId: (row) => String(row.id),
		onCreatingRowSave: async ({ values, table }) => {
			const ok = await handleCreate(values, getUserId());
			if (ok) table.setCreatingRow(null);
		},
		onEditingRowSave: async ({ values, row, table }) => {
			const ok = await handleUpdate({ ...values, id: row.original.id } as LRReceipt);
			if (ok) table.setEditingRow(null);
		},

		// 👇👇 Make the table fill the page and avoid internal scroll
		enableStickyHeader: false,
		enableStickyFooter: false,
		layoutMode: "semantic", // simple DOM layout; plays nicer with full-height parent
		columnResizeMode: "onChange",
		enableTopToolbar: true,
		enableBottomToolbar: true,

		muiTableContainerProps: {
			sx: {
				height: "100%",
				maxHeight: "100% !important",
				overflow: "hidden !important", // let the page (not the table) manage scroll
			},
		},
		muiTablePaperProps: {
			sx: {
				height: "100%",
				display: "flex",
				flexDirection: "column",
				boxShadow: "none",
			},
		},
		muiTableBodyProps: {
			sx: {
				"& tr": { height: 48 }, // compact rows
			},
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

		state: { isLoading, showAlertBanner: isError },
	});

	return (
	// 👇 Full-viewport page section; no extra scrollbars
		<Box
			sx={{
				height: "100vh",            // fill the app viewport
				width: "100%",
				boxSizing: "border-box",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",         // prevent inner page scrollbars
				p: 2,
			}}
		>
			<Typography variant="h6" sx={{ mb: 1, flexShrink: 0 }} textAlign="center">
				LR Receipts Management
			</Typography>

			{/* Table area fills remaining space */}
			<Box sx={{ flex: 1, minHeight: 0 }}>
				<MaterialReactTable table={table} />
			</Box>
		</Box>
	);
};

export default LRReceiptPage;
