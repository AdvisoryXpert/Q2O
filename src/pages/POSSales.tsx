import React, { useEffect, useMemo, useState } from "react";
import { getUserId } from "../services/AuthService";
import {
	AppBar,
	Box,
	Button,
	Card,
	IconButton,
	Paper,
	TextField,
	Toolbar,
	Typography,
	useMediaQuery,
	useTheme,
	Stack,
	Autocomplete,
	Divider,
	Chip,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import { http } from "../lib/http";
import { useNavigate } from "react-router-dom";

/* -------------------------- Types -------------------------- */
type Dealer = { dealer_id: number; full_name: string; [k: string]: any };
type Variant = { attribute_id: number; attribute_name: string; price: number; [k: string]: any };
type Product = { product_id: number; product_name: string; variants: Variant[]; [k: string]: any };

type RowState = {
  product_id: number | "";
  component_id: number | "";
  components: Variant[];
  disabled: boolean;
};

type CartItem = {
  id: number;
  name: string;
  price: number;
  attribute_id: number;
  quantity: number;
};

/* -------------------------- Utils -------------------------- */
const toINR = (n: number) =>
	n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/* XL input styling for TextField inside Autocomplete */
const inputXL = {
	"& .MuiInputBase-root": {
		height: 64,
		borderRadius: 12,
		px: 1.5,
		fontSize: 16,
	},
	"& .MuiInputBase-input": { py: 1.75 },
	"& .MuiFormLabel-root": { fontSize: 14 },
};

export default function POSSalesPage() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const navigate = useNavigate();

	const [products, setProducts] = useState<Product[]>([]);
	const [dealers, setDealers] = useState<Dealer[]>([]);
	const [selectedDealer, setSelectedDealer] = useState<number | "">("");
	const [rows, setRows] = useState<RowState[]>([
		{ product_id: "", component_id: "", components: [], disabled: false },
	]);
	const [cart, setCart] = useState<CartItem[]>([]);
	const [cartNote, setCartNote] = useState("");

	const productsLoading = products.length === 0;
	const dealersLoading = dealers.length === 0;

	/* ---------------------- Effects (data) --------------------- */
	useEffect(() => {
		const fetchProducts = async () => {
			try {
				const res = await http.get("/product_variants?all=true");
				setProducts((res.data?.products ?? []) as Product[]);
			} catch (err) {
				console.error("Failed to fetch products", err);
			}
		};
		const fetchDealers = async () => {
			try {
				const res = await http.get("/dealers");
				setDealers((res.data?.rows ?? []) as Dealer[]);
			} catch (err) {
				console.error("Failed to fetch dealers", err);
			}
		};
		fetchProducts();
		fetchDealers();
	}, []);

	/* ---------------------- Row handlers ---------------------- */
	const updateRowProduct = (index: number, product_id: number | "") => {
		const product = products.find((p) => p.product_id === product_id);
		setRows((prev) => {
			const next = [...prev];
			next[index] = {
				product_id,
				components: product?.variants || [],
				component_id: "",
				disabled: prev[index].disabled && !!product_id ? prev[index].disabled : false,
			};
			return next;
		});
	};

	const updateRowComponent = (index: number, component_id: number | "") => {
		setRows((prev) => {
			const next = [...prev];
			next[index].component_id = component_id;
			return next;
		});
	};

	const addRow = () => {
		setRows((prev) => [
			...prev,
			{ product_id: "", component_id: "", components: [], disabled: false },
		]);
	};

	const removeRow = (index: number) => {
		setRows((prev) => prev.filter((_, i) => i !== index));
	};

	/* ---------------------- Cart handlers --------------------- */
	const addToCart = () => {
		const updatedRows = rows.map((row) => {
			const product =
        row.product_id !== "" ? products.find((p) => p.product_id === row.product_id) : null;
			const variant =
        row.component_id !== "" ? row.components.find((v) => v.attribute_id === row.component_id) : null;

			if (!product || !variant) return row;

			setCart((prev) => {
				const exists = prev.find((i) => i.attribute_id === variant.attribute_id);
				if (exists) {
					return prev.map((i) =>
						i.attribute_id === variant.attribute_id ? { ...i, quantity: i.quantity + 1 } : i
					);
				}
				return [
					...prev,
					{
						id: product.product_id,
						name: `${product.product_name} - ${variant.attribute_name}`,
						price: variant.price,
						attribute_id: variant.attribute_id,
						quantity: 1,
					},
				];
			});

			return { ...row, disabled: true };
		});

		setRows(updatedRows);
	};

	const updateQuantity = (attribute_id: number, quantity: number) => {
		const qty = Math.max(1, quantity);
		setCart((prev) =>
			prev.map((i) => (i.attribute_id === attribute_id ? { ...i, quantity: qty } : i))
		);
	};

	const removeItem = (attribute_id: number) => {
		setCart((prevCart) => {
			const next = prevCart.filter((i) => i.attribute_id !== attribute_id);
			setRows((prevRows) =>
				prevRows.map((r) => (r.component_id === attribute_id ? { ...r, disabled: false } : r))
			);
			return next;
		});
	};

	const total = useMemo(
		() => cart.reduce((acc, item) => acc + item.quantity * item.price, 0),
		[cart]
	);

	/* ----------------------- Submit order ---------------------- */
	const handleSubmitOrder = async () => {
		const user_id = parseInt((await getUserId()) || "0", 10);
		if (!selectedDealer || !user_id || cart.length === 0) return;

		const dealerDetails = dealers.find((d) => d.dealer_id === selectedDealer);
		if (!dealerDetails) {
			alert("Invalid dealer selected");
			return;
		}

		try {
			const response = await http.post("/dealer-quotation-from-cart", {
				dealer: dealerDetails,
				user_id,
				total_price: total,
				cartItems: cart.map((item) => ({
					product_id: item.id,
					product_attribute_id: item.attribute_id,
					quantity: item.quantity,
					unit_price: item.price,
				})),
				note: cartNote,
			});

			const newQuoteId = response.data?.quote_id;
			alert("Quotation created successfully!");
			setCart([]);
			navigate(`/quotation-items/${newQuoteId}`);
		} catch (error) {
			console.error("Quotation creation failed", error);
			alert("Failed to create quotation.");
		}
	};

	const canAddToCart = rows.some((r) => !!r.product_id && !!r.component_id && !r.disabled);

	return (
		<Paper
			sx={{
				position: "fixed",
				left: isMobile ? 0 : "var(--app-drawer-width, 240px)",
				top: "var(--app-header-height, 56px)",
				right: 0,
				bottom: 100, // Added margin for chatbot
				display: "flex",
				flexDirection: "column",
				borderRadius: 2,
				boxShadow: 3,
				overflow: "hidden",
				bgcolor: "background.paper",
			}}
		>
			{/* Top Bar */}
			<AppBar position="static" color="transparent" elevation={0} sx={{ flex: "0 0 auto" }}>
				<Toolbar
					sx={{
						minHeight: 56,
						gap: 2,
						justifyContent: "flex-start",
						px: { xs: 1.5, sm: 2 },
					}}
				>
					<Typography variant="h6" sx={{ fontWeight: 700, mr: 1 }}>
						Point of Sale
					</Typography>

					{/* Dealer typed search */}
					<Autocomplete
						disablePortal
						options={dealers}
						loading={dealersLoading}
						getOptionLabel={(opt) => opt?.full_name ?? ""}
						isOptionEqualToValue={(o, v) => o.dealer_id === v.dealer_id}
						sx={{ flex: 1, maxWidth: 560 }}
						value={
							selectedDealer === "" ? null : dealers.find((d) => d.dealer_id === selectedDealer) ?? null
						}
						onChange={(_, newValue) => setSelectedDealer(newValue ? newValue.dealer_id : "")}
						renderInput={(params) => (
							<TextField
								{...params}
								size="small"
								fullWidth
								label="Select Dealer"
								placeholder={dealersLoading ? "Loading..." : "Type to search"}
							/>
						)}
					/>
				</Toolbar>
			</AppBar>

			{/* Content: FLEX layout → left grows, cart fixed width */}
			<Box
				sx={{
					flex: "1 1 auto",
					minHeight: 0,
					overflow: "hidden",
					display: "flex",
					flexDirection: { xs: "column", md: "row" },
					gap: 2,
					p: { xs: 1.5, sm: 2 },
				}}
			>
				{/* LEFT: fills all width → BIG inputs */}
				<Box sx={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
					<Card
						variant="outlined"
						sx={{
							p: { xs: 2, sm: 2.5 },
							mb: 2,
							borderRadius: 3,
							borderColor: "divider",
							bgcolor: "grey.50",
						}}
					>
						<Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
							Items
						</Typography>

						{rows.map((row, index) => {
							const productValue =
                row.product_id === "" ? null : products.find((p) => p.product_id === row.product_id) ?? null;
							const componentValue =
                row.component_id === ""
                	? null
                	: row.components.find((c) => c.attribute_id === row.component_id) ?? null;

							return (
								<Card
									key={index}
									variant="outlined"
									sx={{ p: { xs: 1.5, sm: 2 }, mb: 1.5, borderRadius: 2, background: "#fff" }}
								>
									<Stack spacing={1.5}>
										{/* PRODUCT — XL, full width */}
										<Autocomplete
											disablePortal
											options={products}
											loading={productsLoading}
											getOptionLabel={(opt) => opt?.product_name ?? ""}
											isOptionEqualToValue={(o, v) => o.product_id === v.product_id}
											value={productValue}
											onChange={(_, newValue) =>
												updateRowProduct(index, newValue ? newValue.product_id : "")
											}
											renderInput={(params) => (
												<TextField
													{...params}
													label="Product"
													fullWidth
													placeholder={productsLoading ? "Loading..." : "Type to search product"}
													sx={inputXL}
												/>
											)}
											disabled={row.disabled}
											// make the dropdown wide too
											slotProps={{ paper: { sx: { minWidth: 720 } } }}
										/>

										{/* COMPONENT — XL, full width */}
										<Autocomplete
											disablePortal
											options={row.components}
											getOptionLabel={(opt) =>
												opt ? `${opt.attribute_name} — ${toINR(opt.price)}` : ""
											}
											isOptionEqualToValue={(o, v) => o.attribute_id === v.attribute_id}
											value={componentValue}
											onChange={(_, newValue) =>
												updateRowComponent(index, newValue ? newValue.attribute_id : "")
											}
											renderInput={(params) => (
												<TextField
													{...params}
													label="Component"
													fullWidth
													placeholder="Pick a variant"
													sx={inputXL}
												/>
											)}
											disabled={row.disabled || !row.product_id}
											slotProps={{ paper: { sx: { minWidth: 720 } } }}
										/>

										{/* Row actions */}
										<Stack direction="row" spacing={1} justifyContent="flex-end">
											{row.disabled && (
												<Chip size="small" color="success" label="Added" sx={{ fontWeight: 700 }} />
											)}
											<IconButton onClick={() => removeRow(index)} color="error" disabled={rows.length === 1}>
												<DeleteIcon />
											</IconButton>
										</Stack>
									</Stack>
								</Card>
							);
						})}

						{/* Big actions */}
						<Stack
							direction={{ xs: "column", sm: "row" }}
							spacing={1.5}
							sx={{ mt: 1 }}
							alignItems={{ xs: "stretch", sm: "center" }}
						>
							<Button
								variant="outlined"
								startIcon={<AddCircleOutlineIcon />}
								onClick={addRow}
								size="large"
								sx={{ fontWeight: 800, py: 1.25 }}
								fullWidth={isMobile}
							>
								Add Product
							</Button>
							<Button
								variant="contained"
								onClick={addToCart}
								disabled={!canAddToCart}
								size="large"
								sx={{ fontWeight: 800, py: 1.25 }}
								fullWidth={isMobile}
							>
								Add Selected to Cart
							</Button>
						</Stack>
					</Card>
				</Box>

				{/* RIGHT: fixed width cart on desktop → left stays huge */}
				<Box
					sx={{
						width: { xs: "100%", md: 460, lg: 520 }, // fixed width sidebar
						flexShrink: 0,
						display: "flex",
						flexDirection: "column",
						bgcolor: "grey.50",
						borderRadius: 2,
						p: 2,
						overflow: "hidden",
					}}
				>
					<Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
						<ShoppingCartIcon sx={{ mr: 1 }} /> Cart
					</Typography>
					<Divider sx={{ mb: 2 }} />

					<Box sx={{ flexGrow: 1, overflowY: "auto", pr: 0.5 }}>
						{cart.length === 0 ? (
							<Typography color="text.secondary">Your cart is empty</Typography>
						) : (
							cart.map((item) => (
								<Card
									key={item.attribute_id}
									variant="outlined"
									sx={{ display: "flex", alignItems: "center", p: 1.25, mb: 1, borderRadius: 2 }}
								>
									<Box sx={{ flexGrow: 1, minWidth: 0 }}>
										<Typography variant="body1" fontWeight="bold" noWrap title={item.name}>
											{item.name}
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Price: {toINR(item.price)}
										</Typography>
									</Box>

									<Stack direction="row" alignItems="center" sx={{ mx: 1 }}>
										<IconButton
											size="small"
											onClick={() => updateQuantity(item.attribute_id, item.quantity - 1)}
											disabled={item.quantity <= 1}
										>
											<RemoveIcon fontSize="small" />
										</IconButton>
										<Typography sx={{ mx: 1, minWidth: 20, textAlign: "center" }}>
											{item.quantity}
										</Typography>
										<IconButton
											size="small"
											onClick={() => updateQuantity(item.attribute_id, item.quantity + 1)}
										>
											<AddIcon fontSize="small" />
										</IconButton>
									</Stack>

									<Typography
										variant="body1"
										sx={{ minWidth: 96, textAlign: "right", fontWeight: "bold" }}
									>
										{toINR(item.price * item.quantity)}
									</Typography>

									<IconButton onClick={() => removeItem(item.attribute_id)} color="error" sx={{ ml: 1 }}>
										<DeleteIcon />
									</IconButton>
								</Card>
							))
						)}
					</Box>

					<Box sx={{ pt: 2, mt: "auto" }}>
						<TextField
							label="Notes for Quotation"
							variant="outlined"
							fullWidth
							multiline
							rows={2}
							value={cartNote}
							onChange={(e) => setCartNote(e.target.value)}
							sx={{ mb: 2 }}
						/>
						<Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
							<Typography variant="h6">Subtotal:</Typography>
							<Typography variant="h6" fontWeight="bold">
								{toINR(total)}
							</Typography>
						</Stack>
						<Button
							variant="contained"
							color="primary"
							fullWidth
							disabled={cart.length === 0 || !selectedDealer}
							onClick={handleSubmitOrder}
							size="large"
							sx={{ py: 1.5, fontWeight: "bold" }}
						>
							Proceed to Checkout
						</Button>
					</Box>
				</Box>
			</Box>
		</Paper>
	);
}
