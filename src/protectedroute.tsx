import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getUserMobile } from "./services/AuthService";

type Props = {
	children: JSX.Element;
}

const ProtectedRoute: React.FC<Props> = ({ children }) => {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

	useEffect(() => {
		const checkAuth = async () => {
			const mobile = await getUserMobile();
			setIsAuthenticated(!!mobile);
		};
		checkAuth();
	}, []);

	if (isAuthenticated === null) {
		return <div>Loading...</div>; // Or a loading spinner
	}

	return isAuthenticated ? children : <Navigate to="/" />;
};

export default ProtectedRoute;