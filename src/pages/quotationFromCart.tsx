import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table";
import CircularProgress from "@mui/material/CircularProgress";
import {
	Box,
	Typography,
	TextField,
	Button,
	Snackbar, 
	Alert,
	Tooltip,
	Select,
	MenuItem,
	FormControl
} from "@mui/material";
import ErrorIcon from '@mui/icons-material/Error';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Bot from "../App";
import TopAppBar from "../navBars/topAppBar";
import { useNavAccess } from "../navBars/navBars";
import { http } from "../lib/http";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

type QuotationItem = {
  product_id: number;
  quote_item_id: number;
  product_name: string;
  attribute_name: string;
  product_attribute_id?: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_selected: boolean;
  manual_price?: number;
  is_manual_override?: boolean;
  cost_price?: number;
  min_margin_percent?: number;
  system_price?: number;
  last_attribute_id?: number;
  max_margin_percent?: number;
  max_allowed_price?: number;
  min_allowed_price?: number;
};

type AttributeOption = {
  attribute_id: number;
  name: string;
  value: string;
};

type Note = {
  note_id: number;
  note_text: string;
  created_at?: string;
};

const calculateMarginalPrice = (item: QuotationItem): number => {
	if (item.cost_price && item.min_margin_percent) {
		return parseFloat((item.cost_price * (1 - item.min_margin_percent / 100)).toFixed(2));
	}
	return item.system_price || item.unit_price;
};

const QuotationItems = () => {
	const { id } = useParams();
	const [quoteId, setQuoteId] = useState<number | null>(id ? Number(id) : null);
	const [items, setItems] = useState<QuotationItem[]>([]);
	const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
	const [attributeOptionsMap, setAttributeOptionsMap] = useState<
    Record<number, AttributeOption[]>
  >({});
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
	const [noteContent, setNoteContent] = useState<string>("");
	const [notes, setNotes] = useState<Note[]>([]);
	const [showPDFOptions, setShowPDFOptions] = useState(false);
	const [includeBreakup, setIncludeBreakup] = useState(false);
	const [includeNotes, setIncludeNotes] = useState(false);
	const [snackbar, setSnackbar] = useState({ open: false, message: "" });
	const [invalidItems, setInvalidItems] = useState<Set<number>>(new Set());
	const [loadingRows, setLoadingRows] = useState<Record<number, boolean>>({});
	const [dealerId, setDealerId] = useState<number | null>(null);
	const showError = (msg: string) => setSnackbar({ open: true, message: msg });
	const navItems = useNavAccess();
	const navigate = useNavigate();

	useEffect(() => {
		const invalidIds: number[] = [];
		items.forEach(item => {
			if (!item.is_manual_override) return;
			if (typeof item.manual_price !== "number") return;
      
			const marginalPrice = calculateMarginalPrice(item);
			if (item.manual_price < marginalPrice || item.manual_price > (item.max_allowed_price ?? Infinity))
				 {invalidIds.push(item.quote_item_id);}
		});
		setInvalidItems(invalidIds);
	}, [items]);

	useEffect(() => {
		if (!quoteId) return;

		// Fetch Notes
		http.get(`/notes/${quoteId}`)
			.then((res) => setNotes(res.data || []))
			.catch(() => setNotes([]));

		// ✅ Fetch Quotation Items and dealer_id
		http.get(`/quotation-items/${quoteId}`)
			.then((res) => {
				const data = res.data;
				// ✅ Step 1: Set dealerId if available
				if (data.length > 0 && data[0].dealer_id) {
					setDealerId(data[0].dealer_id);
				}

				// ✅ Step 2: Set items with system_price field
				const itemsWithSystemPrice = data.map((item: QuotationItem) => ({
					...item,
					system_price: item.unit_price,
				}));
				setItems(itemsWithSystemPrice);

				// ✅ Step 3: Set row selection from is_selected
				const initialSelection: Record<string, boolean> = {};
				data.forEach((item: QuotationItem) => {
					if (item.is_selected) {
						initialSelection[item.quote_item_id] = true;
					}
				});
				setRowSelection(initialSelection);

				// ✅ Step 4: Preload attribute options for each product
				const uniqueProductIds = [
					...new Set(data.map((item: QuotationItem) => item.product_id)),
				];
				uniqueProductIds.forEach(async (productId) => {
					if (!attributeOptionsMap[productId]) {
						try {
							const res = await http.get(`/attributes/${productId}`);
							const options = res.data;
							setAttributeOptionsMap((prev) => ({
								...prev,
								[productId]: options,
							}));
						} catch (err) {
							console.error(
								`Error loading attributes for product ${productId}`,
								err
							);
						}
					}
				});
			})
			.catch((err) => console.error(err));
	}, [quoteId]);


	const handlePriceChange = (quoteItemId: number, newPrice: number) => {
		setItems(prevItems =>
			prevItems.map(item => {
				if (item.quote_item_id !== quoteItemId) return item;

				const min = calculateMarginalPrice(item);
				const max = item.max_allowed_price ?? Infinity;
				const isInvalid = item.is_manual_override && (
					isNaN(newPrice) || newPrice < min || newPrice > max
				);

				// ❗ Fix: Return a Set, not Array
				setInvalidItems(prev => {
					const newSet = new Set(prev);
					if (isInvalid) newSet.add(quoteItemId);
					else newSet.delete(quoteItemId);
					return newSet; // ✅ not Array.from(...)
				});

				return {
					...item,
					manual_price: isNaN(newPrice) ? undefined : newPrice,
					unit_price: isNaN(newPrice)
						? item.system_price || item.unit_price
						: newPrice,
					total_price: isNaN(newPrice)
						? (item.system_price || item.unit_price) * item.quantity
						: newPrice * item.quantity,
				};
			})
		);
	};

	const fetchPricingData = async (attributeId: number, quoteItemId: number) => {
		setLoadingRows(prev => ({ ...prev, [quoteItemId]: true }));
    
		try {
			const res = await http.get(`/pricing/${attributeId}?dealer_id=${dealerId}`);
			const data = res.data;
			return {
				unitPrice: parseFloat(data.price),
				costPrice: parseFloat(data.cost_price),
				marginPercent: parseFloat(data.min_margin_percent),
				marginalPrice: parseFloat(data.min_allowed_price),
				maxAllowedPrice: parseFloat(data.max_allowed_price)
			};
		} catch (err) {
			console.error("Failed to fetch pricing:", err);
			showError("Failed to load pricing data");
			return null;
		} finally {
			setLoadingRows(prev => ({ ...prev, [quoteItemId]: false }));
		}
	};

	const handleAttributeChange = async (row: any, attributeName: string) => {
		const productId = row.original.product_id;
		const options = attributeOptionsMap[productId] || [];
		const selected = options.find(o => o.name === attributeName);
		if (!selected) return;

		const quoteItemId = row.original.quote_item_id;
		const attrId = selected.attribute_id;

		if (row.original.last_attribute_id === attrId) return;

		const pricing = await fetchPricingData(attrId, quoteItemId);
		if (!pricing) return;

		setItems(prev =>
			prev.map(item => {
				if (item.quote_item_id !== quoteItemId) return item;

				const keepOverride = item.is_manual_override;
				const manualPrice = item.manual_price;

				const newUnit = keepOverride && manualPrice ? manualPrice : pricing.unitPrice;

				return {
					...item,
					attribute_name: selected.name,
					product_attribute_id: attrId,
					last_attribute_id: attrId,
					cost_price: pricing.costPrice,
					min_margin_percent: pricing.marginPercent,
					system_price: pricing.unitPrice,
					unit_price: newUnit,
					total_price: newUnit * item.quantity,
				};
			})
		);
	};

	const togglePriceOverride = async (quoteItemId: number) => {
		// take a snapshot of the item we’re about to mutate
		const current = items.find(i => i.quote_item_id === quoteItemId);
		if (!current) return;

		// always hit pricing API for the *latest* marginal price
		const pricing = await fetchPricingData(
			current.product_attribute_id ?? current.last_attribute_id ?? 0,
			quoteItemId
		);
		if (!pricing) return;                       // fetch failed → bail out

		// recompute marginal price from fresh DB data
		const marginalPrice = pricing.marginalPrice;

		setItems(prev =>
			prev.map(it => {
				if (it.quote_item_id !== quoteItemId) return it;

				const enable = !it.is_manual_override;
				const sys    = pricing.unitPrice;       // refreshed system price

				return {
					...it,
					// refresh pricing fields even if override stays OFF
					cost_price:           pricing.costPrice,
					min_margin_percent:   pricing.marginPercent,
					system_price:         sys,
					max_allowed_price: pricing.maxAllowedPrice,
					min_allowed_price: pricing.marginalPrice,

					// switch override state
					is_manual_override:   enable,
					manual_price:         enable ? marginalPrice : undefined,
					unit_price:           enable ? marginalPrice : sys,
					total_price:          (enable ? marginalPrice : sys) * it.quantity,
				};
			})
		);
	};

	const handleSubmit = async () => {
		if (invalidItems.length > 0) {
			showError(`Please fix ${invalidItems.length} item(s) with prices below marginal price`);
			return;
		}

		const updatedItems = items.map((item) => ({
			...item,
			is_selected: rowSelection[item.quote_item_id] === true,
		}));

		try {
			const response = await http.post(`/save-quotation-items/${quoteId}`, updatedItems);

			const result = response.data;
			alert(
				result.success
					? "Quotation items saved successfully!"
					: "Failed to save quotation items.",
			);
		} catch (error) {
			console.error("Error saving items:", error);
			alert("Server error occurred.");
		}
	};

	const handleGeneratePDF = (withBreakup = false, withNotes = false) => {
		if (invalidItems.length > 0) {
			showError("Please fix all price validation errors before generating PDF");
			return;
		}

		const doc = new jsPDF({
			orientation: "portrait",
			unit: "mm",
			format: "a4",
		});
		const selectedItems = items.filter(
			(item) => rowSelection[item.quote_item_id],
		);
		const totalSum = selectedItems.reduce(
			(sum, item) => sum + item.total_price,
			0,
		);

		const head = withBreakup
			? [
				[
					"Product ID",
					"Product Name",
					"Attribute",
					"Quantity",
					"Unit Price",
					"Total Price",
				],
			]
			: [["Product ID", "Product Name", "Attribute", "Total Price"]];

		const body = selectedItems.map((item) => {
			doc.setFont("helvetica", "normal");
			return withBreakup
				? [
					item.product_id,
					item.product_name,
					item.attribute_name,
					item.quantity,
					`₹${item.unit_price.toFixed(2)}`,
					`₹${item.total_price.toFixed(2)}`,
				]
				: [
					item.product_id,
					item.product_name,
					item.attribute_name,
					`₹${item.total_price.toFixed(2)}`,
				];
		});
    
		doc.text(`Quotation Items for Quote ID: ${quoteId}`, 10, 10);
		autoTable(doc, { head, body, startY: 20 });

		let endY = (doc as any).lastAutoTable?.finalY || 30;
		doc.text(`Total Sum: ₹${totalSum.toFixed(2)}`, 10, endY + 10);

		if (withNotes && notes.length > 0) {
			doc.addPage();
			doc.setFontSize(14);
			doc.text(`Notes for Quote ID: ${quoteId}`, 10, 20);

			notes.forEach((note, index) => {
				const date = note.created_at
					? new Date(note.created_at).toLocaleString()
					: "No Date";
				doc.setFontSize(10);
				doc.text(`${index + 1}. ${date}`, 10, 30 + index * 20);
				doc.setFontSize(11);
				doc.text(
					doc.splitTextToSize(
						typeof note.note_text === "string"
							? note.note_text.replace(/<\/?[^>]+(>|$)/g, "")
							: JSON.stringify(note.note_text),
						180,
					),
					10,
					35 + index * 20,
				);
			});
		}

		doc.save(`Quotation_${quoteId}.pdf`);
	};

	const handleDispatchOrder = async () => {
		if (invalidItems.length > 0) {
			showError("Please fix all price validation errors before dispatching");
			return;
		}

		const updatedItems = items.map((item) => ({
			...item,
			is_selected: rowSelection[item.quote_item_id] === true,
		}));

		try {
			const saveResponse = await http.post(`/save-quotation-items/${quoteId}`, updatedItems);
			const saveResult = saveResponse.data;

			if (!saveResult.success) {
				alert("Failed to save quotation items. Dispatch aborted.");
				return;
			}

			const dispatchResponse = await http.post(`/quotestoorder/${quoteId}`);
			const dispatchResult = dispatchResponse.data;

			if (dispatchResponse.status === 200) {
				navigate(`/Order-Line-Items/${dispatchResult.order_id}`);
			} else {
				alert(`❌ Dispatch Failed: ${dispatchResult.error || "Unknown error"}`);
			}
		} catch (error) {
			console.error("Dispatch error:", error);
			alert("❌ Server error occurred while dispatching order.");
		}
	};

	const saveNote = async () => {
		if (!quoteId) return;
		try {
			await http.post(`/notes/${quoteId}`, { content: noteContent });
			setNoteContent("");
			alert("Note saved successfully!");
			const res = await http.get(`/notes/${quoteId}`);
			setNotes(res.data || []);
		} catch {
			alert("Error saving note.");
		}
	};

	const columns = useMemo<MRT_ColumnDef<QuotationItem>[]>(
		() => [
			{
				accessorKey: "product_id",
				header: "Product ID",
			},
			{
				accessorKey: "product_name",
				header: "Product Name",
			},
			{
				accessorKey: "attribute_name",
				header: "Attribute",
				Cell: ({ row, cell }) => {
					const productId = row.original.product_id;
					const options = attributeOptionsMap[productId] || [];
					const isLoading = loadingRows[row.original.quote_item_id];
					const isManualOverride = row.original.is_manual_override;

					return (
						<Tooltip
							title={
								isManualOverride
									? "Disabled during manual pricing"
									: "Change attribute"
							}
						>
							<Box sx={{ position: "relative" }}>
								<FormControl fullWidth size="small">
									<Select
										value={cell.getValue() || ""}
										onChange={(e) => handleAttributeChange(row, e.target.value)}
										disabled={row.original.is_manual_override || isLoading}
									>
										{options.map((opt) => (
											<MenuItem key={opt.attribute_id} value={opt.name}>
												{opt.name}
											</MenuItem>
										))}
									</Select>
								</FormControl>
								{isLoading && (
									<CircularProgress
										size={24}
										sx={{
											position: "absolute",
											top: "50%",
											right: 8,
											marginTop: -1,
											marginLeft: -1,
										}}
									/>
								)}
							</Box>
						</Tooltip>
					);
				},
			},
			{
				accessorKey: "quantity",
				header: "Quantity",
			},
			{
				accessorKey: "price_control",
				header: "Price Control",
				Cell: ({ row }) => {
					const item = row.original;
					const isLoading = loadingRows[item.quote_item_id];

					return (
						<Button
							variant="outlined"
							size="small"
							disabled={isLoading}
							onClick={() => togglePriceOverride(item.quote_item_id)}
						>
							{item.is_manual_override ? "Reset to System" : "Set Manual Price"}
						</Button>
					);
				},
			},
			{
				accessorKey: "manual_price",
				header: "Manual Price",
				Cell: ({ row }) => {
					const item = row.original;
					const min = item.min_allowed_price ?? 0;
					const max = item.max_allowed_price ?? Infinity;
					const currentValue = item.manual_price ?? '';
					const isLoading = loadingRows[item.quote_item_id];

					const isInvalid =
		item.is_manual_override &&
		item.manual_price !== undefined &&
		(item.manual_price < min || item.manual_price > max);

					const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
						const inputValue = e.target.value;
						const numValue = inputValue === '' ? NaN : parseFloat(inputValue);
						handlePriceChange(item.quote_item_id, numValue);
					};

					const handleBlur = () => {
						// No auto-reset; just let user correct it manually
						if (currentValue === '' || isNaN(Number(currentValue))) {
							return;
						}
					};

					return (
						<Tooltip 
							title={
								!item.is_manual_override 
									? "Enable manual pricing first" 
									: `Allowed range: ₹${min.toFixed(2)} - ₹${max.toFixed(2)}`
							}
						>
							<TextField
								size="small"
								type="number"
								fullWidth
								disabled={!item.is_manual_override || isLoading}
								value={currentValue}
								onChange={handleChange}
								onBlur={handleBlur}
								inputProps={{
									min,
									max,
									step: "0.01"
								}}
								error={isInvalid}
								helperText={
									isInvalid
										? `Price must be between ₹${min.toFixed(2)} and ₹${max.toFixed(2)}`
										: ''
								}
								sx={{
									'& .MuiInputBase-input': {
										textAlign: 'right',
										paddingRight: '8px'
									}
								}}
							/>
						</Tooltip>
					);
				},
			},
			{
				accessorKey: "unit_price",
				header: "Unit Price",
				Cell: ({ cell }) => `₹${cell.getValue<number>().toFixed(2)}`,
			},
			/*{
				accessorKey: "total_price",
				header: "Total Price",
				Cell: ({ cell }) => `₹${cell.getValue<number>().toFixed(2)}`,
			},*/
		],
		[items, attributeOptionsMap, invalidItems, loadingRows],
	);

	return (
		<Box sx={{ padding: 2 }}>
			<TopAppBar navItems={navItems} />
			<Typography variant="h4" mb={2}>
				Quotation Items
			</Typography>

			{invalidItems.length > 0 && (
				<Alert severity="error" sx={{ mb: 2 }}>
					<Box display="flex" alignItems="center">
						<ErrorIcon sx={{ mr: 1 }} />
						{invalidItems.length} Some products have invalid prices. 
						Please correct them before submitting.
					</Box>
				</Alert>
			)}

			<TextField
				label="Enter Quotation ID"
				type="number"
				fullWidth
				sx={{ mb: 2, maxWidth: 300 }}
				value={quoteId ?? ""}
				onChange={(e) => setQuoteId(Number(e.target.value))}
			/>

			<MaterialReactTable
				columns={columns}
				data={items}
				enableRowSelection
				state={{ rowSelection, pagination }}
				onPaginationChange={setPagination}
				getRowId={(row) => `${row.quote_item_id}`}
				onRowSelectionChange={setRowSelection}
			/>

			<Typography variant="h6" align="right" sx={{ mt: 2 }}>
				Total Sum: ₹
				{items
					.filter((item) => rowSelection[item.quote_item_id])
					.reduce((sum, item) => sum + item.total_price, 0)
					.toFixed(2)}
			</Typography>

			<Box sx={{ display: "flex", justifyContent: "center", gap: 3, mt: 3 }}>
				<Button 
					variant="contained" 
					color="success" 
					onClick={handleSubmit}
					disabled={invalidItems.length > 0}
				>
					Save Quotation
				</Button>
				<Button
					variant="contained"
					color="secondary"
					onClick={handleDispatchOrder}
					disabled={invalidItems.length > 0}
				>
					Dispatch Order
				</Button>
				<Button
					variant="contained"
					color="primary"
					disabled={invalidItems.length > 0}
					onClick={() => setShowPDFOptions(true)}
				>
					Download PDF
				</Button>
			</Box>

			<Box sx={{ mt: 5 }}>
				<Typography variant="h6">Write Note for Quote #{quoteId}</Typography>
				<ReactQuill
					theme="snow"
					value={noteContent}
					onChange={setNoteContent}
					style={{
						height: "200px",
						marginBottom: "20px",
						backgroundColor: "#fff",
					}}
				/>
				<Box sx={{ display: "flex", justifyContent: "center", gap: 3, mt: 10 }}>          
					<Button variant="contained" onClick={saveNote}>
						Save Note
					</Button>
				</Box>
			</Box>

			{notes.length > 0 && (
				<Box sx={{ mt: 4, p: 2, backgroundColor: "#fffde7", borderRadius: 2 }}>
					<Typography variant="h6" gutterBottom>
						Previous Notes
					</Typography>
					{notes.map((note) => (
						<Box
							key={note.note_id}
							sx={{ mb: 3, p: 2, border: "1px solid #ddd", borderRadius: 2 }}
						>
							<Typography variant="caption" sx={{ color: "gray" }}>
								{note.created_at
									? new Date(note.created_at).toLocaleString()
									: "No Date Available"}
							</Typography>
							<div
								dangerouslySetInnerHTML={{
									__html:
                    typeof note.note_text === "string"
                    	? note.note_text
                    	: JSON.stringify(note.note_text),
								}}
								style={{ marginTop: "8px", fontSize: "0.95rem" }}
							/>
						</Box>
					))}
				</Box>
			)}

			{showPDFOptions && (
				<Box
					sx={{
						position: "fixed",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%)",
						backgroundColor: "white",
						border: "1px solid #ccc",
						borderRadius: 2,
						boxShadow: 5,
						padding: 4,
						zIndex: 1000,
						minWidth: 300,
					}}
				>
					<Typography variant="h6" gutterBottom>
						Select PDF Options
					</Typography>

					<Box>
						<label>
							<input
								type="checkbox"
								checked={includeBreakup}
								onChange={(e) => setIncludeBreakup(e.target.checked)}
							/>{" "}
							Include Break-up (Quantity, Unit Price)
						</label>
					</Box>
					<Box mt={1}>
						<label>
							<input
								type="checkbox"
								checked={includeNotes}
								onChange={(e) => setIncludeNotes(e.target.checked)}
							/>{" "}
							Include Notes
						</label>
					</Box>

					<Box mt={3} display="flex" justifyContent="space-between">
						<Button variant="outlined" onClick={() => setShowPDFOptions(false)}>
							Cancel
						</Button>
						<Button
							variant="contained"
							onClick={() => {
								handleGeneratePDF(includeBreakup, includeNotes);
								setShowPDFOptions(false);
							}}
						>
							Generate PDF
						</Button>
					</Box>
				</Box>
			)}

			<Snackbar
				open={snackbar.open}
				autoHideDuration={6000}
				onClose={() => setSnackbar({...snackbar, open: false})}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				<Alert severity="error">{snackbar.message}</Alert>
			</Snackbar>

			<Bot />
		</Box>
	);
};

export default QuotationItems;