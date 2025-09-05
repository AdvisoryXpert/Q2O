import { useEffect, useState } from "react";
import { http } from "../../src/lib/http";
import { navIcons, type NavItem } from "./navIcons";
import { getAuthLite, subscribeAuth } from "../auth/authBus"; // ✅ same path

const SHOW_ALL_NAV_WHEN_EMPTY = true;

function parseJwt(token?: string | null): any | null {
	if (!token) return null;
	try {
		const base64Url = token.split(".")[1];
		const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split("")
				.map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
				.join("")
		);
		return JSON.parse(jsonPayload);
	} catch (err) {
		console.error("[NAV] JWT parse failed:", err);
		return null;
	}
}

export const useNavAccess = () => {
	const [icons, setIcons] = useState<NavItem[]>([]);
	const [uid, setUid] = useState<string | number | null>(getAuthLite()?.id ?? null);
	const [mobile, setMobile] = useState<string | null>(getAuthLite()?.mobile ?? null);

	// 1) Subscribe to the in-memory auth bus
	useEffect(() => {
		console.log("[NAV] subscribing to authBus. Initial:", getAuthLite());
		return subscribeAuth((u) => {
			console.log("[NAV] bus update:", u);
			setUid(u?.id ?? null);
			setMobile(u?.mobile ?? null);
		});
	}, []);

	// 2) Fallback: decode JWT (note: your JWT doesn't include mobile)
	useEffect(() => {
		if (uid && mobile) return;
		const token = localStorage.getItem("auth_token");
		console.log("[NAV] trying JWT fallback:", token ? "token found" : "no token");
		const d = parseJwt(token);
		if (!uid && d?.user_id != null) {
			console.log("[NAV] uid from JWT:", d.user_id);
			setUid(d.user_id);
		}
		if (!mobile && d?.mobile) {
			console.log("[NAV] mobile from JWT:", d.mobile);
			setMobile(String(d.mobile));
		}
	}, [uid, mobile]);

	// 3) Call access API once we have both
	useEffect(() => {
		console.log("[NAV] effect with", { uid, mobile });
		if (!uid || !mobile) {
			console.warn("[NAV] Missing uid or mobile → icons cleared");
			setIcons([]);
			return;
		}

		const ac = new AbortController();

		(async () => {
			const qs = new URLSearchParams({
				user_id: String(uid),
				mobile: String(mobile),
			}).toString();

			console.log("[NAV] calling /user-access with", { uid, mobile, qs });

			let allowed: string[] = [];

			try {
				const { data } = await http.get(`/userMgmt/user-access?${qs}`, {
					signal: ac.signal as any,
				});
				console.log("[NAV] GET /user-access response:", data);
				allowed = Array.isArray(data?.access) ? data.access : [];
			} catch (err) {
				console.error("[NAV] GET /user-access failed, trying POST:", err);
				try {
					const { data } = await http.post(
						`/userMgmt/user-access`,
						{ user_id: uid, mobile },
						{ signal: ac.signal as any }
					);
					console.log("[NAV] POST /user-access response:", data);
					allowed = Array.isArray(data?.access) ? data.access : [];
				} catch (err2) {
					console.error("[NAV] POST /user-access failed:", err2);
					allowed = [];
				}
			}

			if (allowed.length === 0 && SHOW_ALL_NAV_WHEN_EMPTY) {
				console.warn("[NAV] API returned no access, showing ALL icons for debug");
				setIcons(navIcons);
				return;
			}

			const labels = navIcons.map((i) => i.label);
			const unknown = allowed.filter((a) => !labels.includes(a));
			if (unknown.length) {
				console.warn("[NAV] API labels not in navIcons:", unknown);
			}

			const filtered = navIcons.filter((i) => allowed.includes(i.label));
			console.log("[NAV] final filtered icons:", filtered.map((i) => i.label));
			setIcons(filtered);
		})();

		return () => ac.abort();
	}, [uid, mobile]);

	return icons;
};
