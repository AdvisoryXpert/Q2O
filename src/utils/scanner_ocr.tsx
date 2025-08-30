// src/utils/serialScanner.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
//import API from '../apiConfig'; 

export const BarcodeScanner = ({ onDetected, onClose }: {
  onDetected: (serial: string) => void,
  onClose: () => void
}) => {
	const scannerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const scanner = new Html5QrcodeScanner('qr-reader', {
			fps: 10,
			qrbox: { width: 250, height: 250 }
		}, false);

		scanner.render(
			(decodedText) => {
				console.log('Barcode detected:', decodedText);
				onDetected(decodedText);
				scanner.clear().then(onClose);
			},
			(error) => console.warn('Scan error:', error)
		);

		return () => {
			scanner.clear().catch(console.error);
		};
	}, []);

	return <div id="qr-reader" ref={scannerRef} />;
};

export const CameraOCRScanner = ({ index, onDetected, onClose }: {
  index: number,
  onDetected: (index: number, serial: string) => void,
  onClose: () => void
}) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const startCamera = async () => {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true });
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				videoRef.current.play();
			}
		};
		startCamera();
		return () => {
			if (videoRef.current && videoRef.current.srcObject) {
				const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
				tracks.forEach(track => track.stop());
			}
		};
	}, []);

	const captureAndSendToOCR = async () => {
		if (!videoRef.current || !canvasRef.current) return;

		const canvas = canvasRef.current;
		const video = videoRef.current;
		const ctx = canvas.getContext('2d');
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

		setLoading(true);

		canvas.toBlob(async (blob) => {
			if (!blob) return;
			const formData = new FormData();
			formData.append('image', blob);

			try {
				const response = await fetch(`https://192.168.66.103:8000/ocr`, {
					method: 'POST',
					body: formData,
				});

				const result = await response.json();
				console.log("📤 OCR API response:", result);
				alert(`📄 Raw OCR:\n${result.raw_text}\n🔍 Serials: ${result.serials?.join(', ') || 'None'}`);

				if (result.success && Array.isArray(result.serials) && result.serials.length > 0) {
					onDetected(index, result.serials[0]);
					setLoading(false);
					onClose();
				} else {
					alert('❌ No valid serials returned. Try again.');
					setLoading(false);
				}
			} catch (error: any) {
				console.error('❌ OCR API Error:', error);
				alert(`❌ OCR failed.\n${error?.message || 'Unknown error occurred'}`);
				setLoading(false);
			}
		}, 'image/png');
	};

	return (
		<Box>
			<Typography textAlign="center">Align serial number and click Capture</Typography>
			<video ref={videoRef} width="100%" style={{ borderRadius: 8 }} />
			<canvas ref={canvasRef} style={{ display: 'none' }} />
			{loading ? (
				<CircularProgress sx={{ mt: 2 }} />
			) : (
				<Button
					fullWidth
					variant="contained"
					sx={{ mt: 2 }}
					onClick={captureAndSendToOCR}
				>
					📷 Capture & OCR
				</Button>
			)}
			<Button onClick={onClose} fullWidth sx={{ mt: 1 }}>
				Cancel
			</Button>
		</Box>
	);
};