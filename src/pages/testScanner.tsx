// src/pages/TestScanner.tsx
import React, { useState } from 'react';
import { Box, Typography, Button, TextField, Divider } from '@mui/material';
import { BarcodeScanner, CameraOCRScanner } from '../utils/scanner_ocr';

const TestScanner = () => {
	const [barcodeResult, setBarcodeResult] = useState('');
	const [ocrResult, setOcrResult] = useState('');
	const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
	const [showOcrScanner, setShowOcrScanner] = useState(false);

	return (
		<Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
			<Typography variant="h4" textAlign="center" gutterBottom>
				Scanner Testing Page
			</Typography>

			<Divider sx={{ my: 3 }} />

			<Typography variant="h6">Barcode / QR Code</Typography>
			<Button
				variant="contained"
				sx={{ my: 1 }}
				onClick={() => {
					setShowBarcodeScanner(true);
					setShowOcrScanner(false);
				}}
			>
				Start Barcode Scan
			</Button>
			{showBarcodeScanner && (
				<BarcodeScanner
					onDetected={(val) => setBarcodeResult(val)}
					onClose={() => setShowBarcodeScanner(false)}
				/>
			)}
			<TextField
				label="Barcode Result"
				fullWidth
				variant="outlined"
				sx={{ mt: 2 }}
				value={barcodeResult}
				onChange={(e) => setBarcodeResult(e.target.value)}
			/>

			<Divider sx={{ my: 3 }} />

			<Typography variant="h6">OCR via Camera</Typography>
			<Button
				variant="contained"
				sx={{ my: 1 }}
				onClick={() => {
					setShowOcrScanner(true);
					setShowBarcodeScanner(false);
				}}
			>
				Start OCR Camera
			</Button>
			{showOcrScanner && (
				<CameraOCRScanner
					onDetected={(val) => setOcrResult(val)}
					onClose={() => setShowOcrScanner(false)}
				/>
			)}
			<TextField
				label="OCR Result"
				fullWidth
				variant="outlined"
				sx={{ mt: 2 }}
				value={ocrResult}
				onChange={(e) => setOcrResult(e.target.value)}
			/>
		</Box>
	);
};

export default TestScanner;