
import React, { useEffect, useState } from "react";
import { Box, Typography, Avatar } from "@mui/material";
import { http } from "../lib/http";

type Tenant = {
	name: string;
	logo_url: string;
}

const TenantDisplay: React.FC = () => {
	const [tenant, setTenant] = useState<Tenant | null>(null);

	useEffect(() => {
		(async () => {
			try {
				const response = await http.get("/tenant");
				console.log('Tenant response:', response);
				if (typeof response.data === 'object' && response.data !== null) {
					setTenant(response.data);
				} else {
					console.error("Received unexpected data type from /tenant:", typeof response.data);
				}
			} catch (error) {
				console.error("Error fetching tenant data:", error);
			}
		})();
	}, []);

	if (!tenant) {
		return null;
	}

	const logoUrl = tenant.logo_url;

	return (
		<Box sx={{ width: "100%" }}>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 2,
					p: 1,
					width: "100%",
				}}
			>
				<Avatar
					src={logoUrl}
					alt={tenant.name}
					variant="rounded"
					sx={{
						width: 60,
						height: 60,
						border: "2px solid rgba(255, 255, 255, 0.5)",
						boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
						"& .MuiAvatar-img": {
							objectFit: "contain",
						},
					}}
				/>
				<Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
					<Typography variant="h6" component="h1" sx={{ fontWeight: 500, color: "text.secondary" }}>
						Welcome,
					</Typography>
					<Typography
						variant="h4"
						component="h1"
						sx={{
							fontWeight: 700,
							color: "text.primary",
						}}
					>
						{tenant.name}
					</Typography>					
				</Box>
			</Box>
		</Box>
	);
};

export default TenantDisplay;
