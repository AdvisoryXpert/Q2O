
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
				console.log("Full response from /tenant:", response);

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
		<Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
			<Avatar src={logoUrl} alt={tenant.name} sx={{ width: 56, height: 56 }} />
			<Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
				{tenant.name}
			</Typography>
		</Box>
	);
};

export default TenantDisplay;
