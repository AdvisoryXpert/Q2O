
import React, { useEffect, useState } from "react";
import { Box, Typography, Avatar, Divider } from "@mui/material";
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
		<Box sx={{ width: "100%", mb: 2 }}>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 3,
					p: 2,
					width: "100%",
				}}
			>
				<Avatar
					src={logoUrl}
					alt={tenant.name}
					variant="rounded"
					sx={{
						width: 120,
						height: 120,
						border: "4px solid rgba(255, 255, 255, 0.5)",
						boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
						"& .MuiAvatar-img": {
							objectFit: "contain",
						},
					}}
				/>
				<Box>
					<Typography
						variant="h2"
						component="h1"
						sx={{
							fontWeight: 700,
							color: "text.primary",
						}}
					>
						{tenant.name}
					</Typography>
					<Typography variant="h5" color="text.secondary">
						Welcome
					</Typography>
				</Box>
			</Box>
			<Divider sx={{ mt: 2 }} />
		</Box>
	);
};

export default TenantDisplay;
