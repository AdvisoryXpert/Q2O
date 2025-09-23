import React, { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import * as Auth from "./services/AuthService";

type Props = { children: React.ReactNode };

export default function ProtectedRoute({ children }: Props) {
	const location = useLocation();
	const [status, setStatus] = useState<"loading" | "authed" | "guest">("loading");
	const once = useRef(false);

	useEffect(() => {
		if (once.current) return; // React 18 StrictMode guard
		once.current = true;

		(async () => {
			try {
				// Fast path: if we already have an auth signal (e.g., token in memory), show content immediately,
				// but still validate with backend to rehydrate on hard refresh.
				if (Auth.isAuthenticated()) setStatus("authed");

				const data = await Auth.getSession(); // backend reads cookie; returns { ok, user, tenant_id }
				setStatus(data?.ok ? "authed" : "guest");
			} catch {
				setStatus("guest");
			}
		})();
	}, []);

	if (status === "loading") {
		return <div style={{ padding: 16 }}>Checking session…</div>;
	}

	if (status === "guest") {
		return <Navigate to="/login" replace state={{ from: location }} />;
	}

	return <>{children}</>;
}
