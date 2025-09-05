import React from "react";
import { Navigate, useLocation } from "react-router-dom";

/** Simple JWT check: presence of auth_token in localStorage */
function hasToken() {
	return !!localStorage.getItem("auth_token");
}

type Props = { children: React.ReactNode };

export default function ProtectedRoute({ children }: Props) {
	const location = useLocation();
	if (!hasToken()) {
		return <Navigate to="/login" replace state={{ from: location }} />;
	}
	return <>{children}</>;
}
