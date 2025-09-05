import React, { useEffect, useState } from 'react';
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	Select,
	MenuItem,
	Box,
	Alert
} from '@mui/material';
import { http } from '../lib/http';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (pricing: any) => void;
};

type Condition = {
  condition_id: number;
  name: string;
};

type Product = {
  product_id: number;
  name: string;
  condition_id: number;
};

type Attribute = {
  attribute_id: number;
  name: string;
  product_id: number;
};

const AddPricingModal: React.FC<Props> = ({ open, onClose, onSave }) => {
	const [conditions, setConditions] = useState<Condition[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [attributes, setAttributes] = useState<Attribute[]>([]);
	const [error, setError] = useState<string | null>(null);

	const [selectedCondition, setSelectedCondition] = useState<number | ''>('');
	const [selectedProduct, setSelectedProduct] = useState<number | ''>('');
	const [selectedAttribute, setSelectedAttribute] = useState<number | ''>('');
	const [minQuantity, setMinQuantity] = useState<number | ''>('');
	const [costPrice, setCostPrice] = useState<number | ''>('');
	const [price, setPrice] = useState<number | ''>('');

	useEffect(() => {
		if (open) {
			fetchConditions();
			setError(null); // Clear error when modal opens
		}
	}, [open]);

	const fetchConditions = async () => {
		try {
			const res = await http.get('/conditions');
			const data = res.data;
			setConditions(data);
		} catch (err) {
			console.error('Failed to fetch conditions', err);
		}
	};

	const fetchProducts = async (conditionId: number) => {
		try {
			const res = await http.get(`/products?condition_id=${conditionId}`);
			const data = res.data;
			setProducts(data);
		} catch (err) {
			console.error('Failed to fetch products', err);
		}
	};

	const fetchAttributes = async (productId: number) => {
		try {
			const res = await http.get(`/product-attributes?product_id=${productId}`);
			const data = res.data;
			setAttributes(data);
		} catch (err) {
			console.error('Failed to fetch attributes', err);
		}
	};

	const handleSave = async () => {
		if (!selectedAttribute) {
			setError('Please select an attribute');
			return;
		}

		try {
			const pricing = {
				attribute_id: selectedAttribute,
				min_quantity: minQuantity,
				cost_price: costPrice,
				price: price,
			};

			await http.post('/product-pricing', pricing);

			onSave(pricing);
			handleClose();
		} catch (err: any) {
			// ✅ Properly extract message and type
			const message = err?.response?.data?.error?.message || err?.message || 'Unknown error';
			const type = err?.response?.data?.error?.type || '';

			setError(
				type === 'DUPLICATE_PRICING'
					? 'This product/attribute combination already has pricing under the selected condition'
					: 'Failed to save pricing: ' + message
			);
		}
	};

	const handleClose = () => {
		setSelectedCondition('');
		setSelectedProduct('');
		setSelectedAttribute('');
		setMinQuantity('');
		setCostPrice('');
		setPrice('');
		setProducts([]);
		setAttributes([]);
		setError(null);
		onClose();
	};

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
			<DialogTitle>Add Pricing</DialogTitle>
			<DialogContent>
				<Box display="flex" flexDirection="column" gap={2} mt={1}>
					{error && (
						<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
							{error}
						</Alert>
					)}

					<Select
						value={selectedCondition}
						onChange={(e) => {
							const val = Number(e.target.value);
							setSelectedCondition(val);
							setSelectedProduct('');
							setSelectedAttribute('');
							setProducts([]);
							setAttributes([]);
							setError(null);
							fetchProducts(val);
						}}
						displayEmpty
						fullWidth
					>
						<MenuItem value="">Select Condition</MenuItem>
						{conditions.map((c) => (
							<MenuItem key={c.condition_id} value={c.condition_id}>
								[{c.condition_id}] {c.name}
							</MenuItem>
						))}
					</Select>

					<Select
						value={selectedProduct}
						onChange={(e) => {
							const val = Number(e.target.value);
							setSelectedProduct(val);
							setSelectedAttribute('');
							setAttributes([]);
							setError(null);
							fetchAttributes(val);
						}}
						disabled={!selectedCondition}
						displayEmpty
						fullWidth
					>
						<MenuItem value="">Select Product</MenuItem>
						{products.map((p) => (
							<MenuItem key={p.product_id} value={p.product_id}>
								[{p.product_id}] {p.name}
							</MenuItem>
						))}
					</Select>

					<Select
						value={selectedAttribute}
						onChange={(e) => {
							setSelectedAttribute(Number(e.target.value));
							setError(null);
						}}
						disabled={!selectedProduct}
						displayEmpty
						fullWidth
					>
						<MenuItem value="">Select Attribute</MenuItem>
						{attributes.map((a) => (
							<MenuItem key={a.attribute_id} value={a.attribute_id}>
								[{a.attribute_id}] {a.name}
							</MenuItem>
						))}
					</Select>

					<TextField
						label="Min Quantity"
						type="number"
						value={minQuantity}
						onChange={(e) => {
							setMinQuantity(Number(e.target.value));
							setError(null);
						}}
						fullWidth
						inputProps={{ min: 1 }}
					/>
          
					<TextField
						label="Cost Price"
						type="number"
						value={costPrice}
						onChange={(e) => {
							setCostPrice(Number(e.target.value));
							setError(null);
						}}
						fullWidth
						inputProps={{ min: 0, step: 0.01 }}
					/>
          
					<TextField
						label="Price"
						type="number"
						value={price}
						onChange={(e) => {
							setPrice(Number(e.target.value));
							setError(null);
						}}
						fullWidth
						inputProps={{ min: 0, step: 0.01 }}
					/>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose}>Cancel</Button>
				<Button onClick={handleSave} variant="contained" color="primary">
					Save
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default AddPricingModal;