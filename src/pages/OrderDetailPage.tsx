import React, { useEffect, useState } from 'react';
import {
	Box,
	Typography,
	TextField,
	Card,
	CardContent,
	Button,
	Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate } from 'react-router-dom';
import { BarcodeScanner, CameraOCRScanner } from '../utils/scanner_ocr';
import { http } from '../lib/http'; 
import { getUserId } from '../services/AuthService'; 
type DispatchItem = {
  order_line_id: number;
  product_id: number;
  product_attribute_id: number;
  dealer_id: number;
  dealer_name: string;
  customer_name: string;
  product_name: string;
  component_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  serial_number: string;
};

const OrderDetailPage = () => {
	const { orderId } = useParams();
	const navigate = useNavigate();
	const [dispatchItems, setDispatchItems] = useState<DispatchItem[]>([]);
	const [scanningIndex, setScanningIndex] = useState<number | null>(null);
	const [ocrCameraIndex, setOcrCameraIndex] = useState<number | null>(null);

	useEffect(() => {
		const fetchDispatchItems = async () => {
			const res = await http.get(`/dipatch_mob/${orderId}`);
			const data = res.data;

			// Extract dealer info from the parent object (not from line items)
			const dealer_id = data.dealer_id;
			const dealer_name = data.dealer_name;

			const withSerials = (data.lineItems || []).map((item: any) => ({
				...item,
				dealer_id,
				dealer_name,
				serial_number: '',
				customer_name: dealer_name
			}));

			setDispatchItems(withSerials);
		};

		fetchDispatchItems();
	}, [orderId]);

	const handleDispatchSerialChange = (index: number, value: string) => {
		const updated = [...dispatchItems];
		updated[index].serial_number = value;
		setDispatchItems(updated);
	};

	const handleSaveAndDispatch = async () => {
		const userId = (await getUserId()) || '1';
		try {
			const response = await http.post('/warranty/', {
				order_id: orderId,
				dispatch_items: dispatchItems.map(item => ({
					order_line_id: item.order_line_id,
					serial_number: item.serial_number,
					product_id: item.product_id,
					product_attribute_id: item.product_attribute_id,
					dealer_id: item.dealer_id,
					customer_name: item.dealer_name, // ✅ use dealer name
					user_id: userId
				}))
			});

			const result = response.data;
			if (response.status !== 200) throw new Error(result?.error || 'Dispatch failed');
			alert('✅ Order dispatched and warranties created successfully!');
		} catch (err: any) {
			console.error('Dispatch Error:', err);
			alert(`❌ Dispatch failed: ${err.message}`);
		}
	};

	return (
		<Box
			sx={{
				padding: 2,
				maxWidth: '600px',
				margin: '0 auto',
				backgroundColor: '#f5f7fa',
				minHeight: '100vh'
			}}
		>
			<Button
				startIcon={<ArrowBackIcon />}
				onClick={() => navigate('/orders')}
				sx={{ mb: 2 }}
			>
				Back to Orders
			</Button>

			<Typography variant="h5" gutterBottom textAlign="center">
				Dispatch for Order #{orderId}
			</Typography>

			<Divider sx={{ my: 2 }} />

			{dispatchItems.length === 0 ? (
				<Typography textAlign="center" color="text.secondary">
					No dispatch items found.
				</Typography>
			) : (
				dispatchItems.map((item, index) => (
					<Card key={index} sx={{ mb: 2, borderRadius: 2 }}>
						<CardContent>
							<Typography variant="body1"><b>Product:</b> {item.product_name}</Typography>
							<Typography variant="body2"><b>Component:</b> {item.component_name}</Typography>
							<Typography variant="body2"><b>Quantity:</b> {item.quantity}</Typography>
							<Typography variant="body2"><b>Unit Price:</b> ₹{item.unit_price}</Typography>
							<Typography variant="body2"><b>Total Price:</b> ₹{item.total_price}</Typography>

							<TextField
								fullWidth
								label="Serial Number"
								variant="outlined"
								value={item.serial_number}
								onChange={(e) => handleDispatchSerialChange(index, e.target.value)}
								sx={{ mt: 2 }}
							/>

							<Button
								variant="outlined"
								fullWidth
								sx={{ mt: 1 }}
								onClick={() => setScanningIndex(index)}
							>
								Scan Barcode / QR
							</Button>

							<Button
								variant="outlined"
								fullWidth
								sx={{ mt: 1 }}
								onClick={() => setOcrCameraIndex(index)}
							>
								Scan From Camera
							</Button>
						</CardContent>
					</Card>
				))
			)}

			{dispatchItems.length > 0 && (
				<Button
					variant="contained"
					fullWidth
					onClick={handleSaveAndDispatch}
					sx={{ mt: 2, padding: 1.5, fontWeight: 'bold' }}
				>
					Save & Dispatch
				</Button>
			)}

			{scanningIndex !== null && (
				<BarcodeScanner
					onDetected={(serial) => {
						const updated = [...dispatchItems];
						updated[scanningIndex].serial_number = serial;
						setDispatchItems(updated);
						setScanningIndex(null);
					}}
					onClose={() => setScanningIndex(null)}
				/>
			)}

			{ocrCameraIndex !== null && (
				<CameraOCRScanner
					index={ocrCameraIndex}
					onDetected={(i, serial) => {
						const updated = [...dispatchItems];
						updated[i].serial_number = serial;
						setDispatchItems(updated);
					}}
					onClose={() => setOcrCameraIndex(null)}
				/>
			)}
		</Box>
	);
};

export default OrderDetailPage;
