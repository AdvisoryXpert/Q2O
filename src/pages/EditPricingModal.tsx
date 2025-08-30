import React from 'react';
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	Box,
	Typography,
} from '@mui/material';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (pricing: any) => void;
  pricingData: {
    condition_id: number;
    product_id: number;
    product_name: string;
    attribute_id: number;
    attribute_name: string;
    min_quantity: number;
    cost_price: number;
    price: number;
  } | null;
};

const EditPricingModal: React.FC<Props> = ({ open, onClose, onSave, pricingData }) => {
	const [minQuantity, setMinQuantity] = React.useState<number>(0);
	const [costPrice, setCostPrice] = React.useState<number>(0);
	const [price, setPrice] = React.useState<number>(0);
	React.useEffect(() => {
		if (pricingData) {
			setMinQuantity(pricingData.min_quantity);
			setCostPrice(pricingData.cost_price);
			setPrice(pricingData.price);
		}
	}, [pricingData]);

	const handleSave = () => {
		if (!pricingData) return;
    
		const updatedPricing = {
			...pricingData,
			min_quantity: minQuantity,
			cost_price: costPrice,
			price: price,
		};
    
		onSave(updatedPricing);
		handleClose();
	};

	const handleClose = () => {
		onClose();
	};

	if (!pricingData) return null;

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
			<DialogTitle>Edit Pricing</DialogTitle>
			<DialogContent>
				<Box display="flex" flexDirection="column" gap={2} mt={1}>
					<Typography variant="body1">
						<strong>Condition ID:</strong> {pricingData.condition_id}
					</Typography>
          
					<Typography variant="body1">
						<strong>Product:</strong> {pricingData.product_name}
					</Typography>
          
					<Typography variant="body1">
						<strong>Attribute:</strong> {pricingData.attribute_name}
					</Typography>

					<TextField
						label="Min Quantity"
						type="number"
						value={minQuantity}
						onChange={(e) => setMinQuantity(Number(e.target.value))}
						fullWidth
					/>
          
					<TextField
						label="Cost Price"
						type="number"
						value={costPrice}
						onChange={(e) => setCostPrice(Number(e.target.value))}
						fullWidth
					/>
          
					<TextField
						label="Price"
						type="number"
						value={price}
						onChange={(e) => setPrice(Number(e.target.value))}
						fullWidth
					/>
          
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleSave} variant="contained">
					Save
				</Button>
				<Button onClick={handleClose}>Cancel</Button>
			</DialogActions>
		</Dialog>
	);
};

export default EditPricingModal;