
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
		<Box sx={{ width: "100%", p: 2 }}>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 2,
				}}
			>
				<Avatar
					src={logoUrl}
					alt={tenant.name}
					variant="rounded"
					sx={{
						width: 80,
						height: 80,
						border: "3px solid rgba(255, 255, 255, 0.5)",
						boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
						"& .MuiAvatar-img": {
							objectFit: "contain",
						},
					}}
				/>
				<Box>
					<Typography variant="h6" component="h2" sx={{ fontWeight: 600, color: "text.primary" }}>
						{tenant.name}
					</Typography>
					<Typography variant="body1" color="text.secondary">
						Welcome
					</Typography>
				</Box>
			</Box>
		</Box>
	);
};

export default TenantDisplay;
