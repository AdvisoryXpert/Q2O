// Updated POSSales.tsx to use dealer-quotation-from-cart API for quote submission
import React, { useEffect, useState } from 'react';
import { getUserId } from '../services/AuthService';
import {
	Box, Typography, Grid, Button, TextField,
	Divider, Paper, MenuItem, Select, InputLabel, FormControl, IconButton, Stack, Autocomplete
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import TopAppBar from '../navBars/topAppBar';
import App from '../App';
import { useNavAccess } from '../navBars/navBars';
import { http } from '../lib/http';
import { useNavigate } from 'react-router-dom';

const POSPage = () => {
	const [products, setProducts] = useState<any[]>([]);
	const [dealers, setDealers] = useState<any[]>([]);
	const [selectedDealer, setSelectedDealer] = useState('');
	const [cart, setCart] = useState<any[]>([]);
	const [rows, setRows] = useState([{ product_id: '', component_id: '', components: [], disabled: false }]);
	const [cartNote, setCartNote] = useState('');
	const [dropdownWidth, setDropdownWidth] = useState(0);
	const navItems = useNavAccess();
	const navigate = useNavigate();

	useEffect(() => {
		const fetchProducts = async () => {
			try {
				const res = await http.get('/product_variants?all=true');
				setProducts(res.data.products);
				console.log("Fetched products:", res.data.products);
				if (res.data.products.length > 0) {
					const longestName = res.data.products.reduce((longest, p) => 
						p.product_name.length > longest.length ? 
							p.product_name : longest, "");
					const canvas = document.createElement("canvas");
					const context = canvas.getContext("2d");
					if (context) {
						context.font = "16px Arial"; // Should match the font of the dropdown
						const width = context.measureText(longestName).width;
						setDropdownWidth(width + 40); // Add some padding
					}
				}
			} catch (err) {
				console.error("Failed to fetch products", err);
			}
		};

		const fetchDealers = async () => {
			const res = await http.get('/dealers');
			setDealers(res.data);
		};

		fetchProducts();
		fetchDealers();
	}, []);

	const updateRowProduct = (index: number, product_id: string) => {
		const product = products.find(p => p.product_id === product_id);
		const newRows = [...rows];
		newRows[index].product_id = product_id;
		newRows[index].components = product?.variants || [];
		newRows[index].component_id = '';
		setRows(newRows);
	};

	const updateRowComponent = (index: number, component_id: string) => {
		const newRows = [...rows];
		newRows[index].component_id = component_id;
		setRows(newRows);
	};

	const addRow = () => {
		setRows([...rows, { product_id: '', component_id: '', components: [] }]);
	};

	const removeRow = (index: number) => {
		setRows(rows.filter((_, i) => i !== index));
	};

	const addToCart = () => {
		const updatedRows = rows.map(row => {
			const product = products.find(p => p.product_id === row.product_id);
			const variant = row.components.find(v => v.attribute_id === row.component_id);
			if (!product || !variant) return row; // If not a valid row, return as is

			const existing = cart.find(item => item.attribute_id === variant.attribute_id);
			if (existing) {
				setCart(prev => prev.map(item => item.attribute_id === variant.attribute_id ?
					{ ...item, quantity: item.quantity + 1 } : item));
			} else {
				setCart(prev => [...prev, {
					id: product.product_id,
					name: `${product.product_name} - ${variant.attribute_name}`,
					price: variant.price,
					attribute_id: variant.attribute_id,
					quantity: 1
				}]);
			}
			return { ...row, disabled: true }; // Mark this row as disabled
		});
		setRows(updatedRows); // Update the rows state
	};

	const updateQuantity = (id: number, quantity: number) => {
		setCart(cart.map(item => item.attribute_id === id ? { ...item, quantity } : item));
	};

	const removeItem = (id: number) => {
		// First, update the cart
		setCart(prevCart => {
			const updatedCart = prevCart.filter(item => item.attribute_id !== id);

			// Now, find the corresponding row and re-enable it
			setRows(prevRows => {
				return prevRows.map(row => {
					// Assuming component_id in row corresponds to attribute_id in cart item
					if (row.component_id === id) {
						return { ...row, disabled: false };
					}
					return row;
				});
			});

			return updatedCart;
		});
	};

	const total = cart.reduce((acc, item) => acc + item.quantity * item.price, 0);

	const handleSubmitOrder = async () => {
		const user_id = parseInt((await getUserId()) || "0", 10);
		if (!selectedDealer || !user_id || cart.length === 0) return;

		const dealerDetails = dealers.find(d => d.dealer_id === selectedDealer);
		if (!dealerDetails) return alert("Invalid dealer selected");

		try {
			const response = await http.post('/dealer-quotation-from-cart', {
				dealer: dealerDetails,
				user_id,
				total_price: total,
				cartItems: cart.map(item => ({
					product_id: item.id,
					product_attribute_id: item.attribute_id,
					quantity: item.quantity,
					unit_price: item.price
				})),
				note: cartNote
			});

			const newQuoteId = response.data.quote_id;
			alert("Quotation created successfully!");
			setCart([]);
			navigate(`/quotation-items/${newQuoteId}`);
		} catch (error) {
			console.error("Quotation creation failed", error);
			alert("Failed to create quotation.");
		}
	};

	return (
		<>
			<TopAppBar navItems={navItems} />
			<Box sx={{ mt: 10, mb: 10, px: 4 }}>
				<Typography variant="h5" gutterBottom>RO System Point of Sale</Typography>

				<Grid container spacing={4}>
					<Grid item xs={12} md={8}>
						<FormControl fullWidth sx={{ mb: 2 }}>
							<InputLabel>Select Dealer</InputLabel>
							<Select
								value={selectedDealer}
								label="Select Dealer"
								onChange={(e) => setSelectedDealer(e.target.value)}
							>
								{dealers.map(dealer => (
									<MenuItem key={dealer.dealer_id} value={dealer.dealer_id}>
										{dealer.full_name}
									</MenuItem>
								))}
							</Select>
						</FormControl>

						{rows.map((row, index) => (
							<Box key={index} sx={{ mb: 2, display: 'flex', gap: 2 }}>
								<FormControl fullWidth>
									<Autocomplete
										options={products}
										getOptionLabel={(option) => option.product_name}
										value={products.find(p => p.product_id === row.product_id) || null}
										onChange={(event, newValue) => {
											updateRowProduct(index, newValue ? newValue.product_id : '');
										}}
										renderInput={(params) => 
											<TextField {...params} 
												label="Product" />}
										PopperComponent={(props) => <div {...props}
											style={{ width: dropdownWidth }} />}
										renderOption={(props, option) => (
											<li {...props} key={option.product_id}>
												{option.product_name}
											</li>
										)}
										noOptionsText={products.length === 0 ? null : "No options"}
										disabled={row.disabled}
									/>
								</FormControl>
								<FormControl fullWidth>
									<InputLabel>Component</InputLabel>
									<Select
										value={row.component_id}
										onChange={(e) => updateRowComponent(index, e.target.value)}
										disabled={row.disabled}
									>
										{row.components.map(c => (
											<MenuItem key={c.attribute_id} value={c.attribute_id}>
												{c.attribute_name} - ₹{c.price}
											</MenuItem>
										))}
									</Select>
								</FormControl>
								<IconButton onClick={() => removeRow(index)} color="error" disabled={row.disabled}>
									<DeleteIcon />
								</IconButton>
							</Box>
						))}
						<Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
							<Button
								variant="outlined"
								startIcon={<AddCircleOutlineIcon />}
								onClick={addRow}
							>
								Add Another Product
							</Button>
							<Button variant="contained" onClick={addToCart}>Add All to Cart</Button>
						</Stack>
					</Grid>

					<Grid item xs={12} md={4} sx={{ bgcolor: '#f8f8f8', p: 3, borderRadius: 2 }}>
						<Paper elevation={3} sx={{ p: 2, position: 'sticky', top: 100, minWidth: 500 }}>
							<Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
								<ShoppingCartIcon sx={{ mr: 1 }} /> Cart
							</Typography>
							<Divider sx={{ my: 2 }} />
							{cart.length === 0 ? (
								<Typography>Your cart is empty</Typography>
							) : (
								cart.map(item => (
									<Paper key={item.attribute_id} elevation={1} sx={{
										display: 'flex',
										alignItems: 'center',
										mb: 2,
										pb: 2,
										borderBottom: '1px solid #eee'
									}}>										
										<Box sx={{ flexGrow: 1 }}>
											<Typography variant="body1" 
												fontWeight="bold">{item.name}</Typography>
											<Typography variant="body2" 
												color="text.secondary">Price: ₹{item.price}</Typography>
										</Box>
										<Box sx={{ display: 'flex', alignItems: 'center', mx: 2 }}>
											<IconButton 
												size="small" 
												onClick={() => updateQuantity(item.attribute_id, item.quantity - 1)} 
												disabled={item.quantity <= 1}
											>
												<RemoveIcon />
											</IconButton>
											<Typography sx={{ mx: 1 }}>{item.quantity}</Typography>
											<IconButton 
												size="small" 
												onClick={() => updateQuantity(item.attribute_id, item.quantity + 1)}
											>
												<AddIcon />
											</IconButton>
										</Box>
										<Typography 
											variant="body1" 
											sx={{ minWidth: 80, textAlign: 'right' }}
										>
											₹{item.price * item.quantity}
										</Typography>
										<IconButton 
											onClick={() => removeItem(item.attribute_id)} 
											color="error" 
											sx={{ ml: 2 }}
										>
											<DeleteIcon />
										</IconButton>
									</Paper>
								))
							)}
							<Divider sx={{ my: 2 }} />
							<TextField
								label="Notes for Quotation"
								variant="outlined"
								fullWidth
								multiline
								minRows={3}
								value={cartNote}
								onChange={(e) => setCartNote(e.target.value)}
								sx={{ mt: 2, mb: 2 }}
							/>
							<Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
								<Typography variant="h6" color="primary" fontWeight="bold">Subtotal:</Typography>
								<Typography variant="h6" color="primary" fontWeight="bold">₹{total}</Typography>
							</Box>
							<Button
								variant="contained"
								color="primary"
								fullWidth
								disabled={cart.length === 0 || !selectedDealer}
								onClick={handleSubmitOrder}
								size="large"
								sx={{ mt: 2, py: 1.5, fontWeight: 'bold', fontSize: '1.1rem' }}
							>
								Proceed to Checkout
							</Button>
						</Paper>
					</Grid>
				</Grid>
			</Box>
			<App />
		</>
	);
};

export default POSPage;