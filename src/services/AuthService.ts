// src/services/AuthService.ts
import { http } from "../lib/http";

/**
 * LocalStorage keys
 */
let inMemoryToken: string | null = null;
let inMemoryUser: User | null = null;
let inMemoryTenantId: string | null = null;

/**
 * Debug (set VITE_DEBUG=1 to enable)
 */
const DEBUG = (import.meta as any)?.env?.VITE_DEBUG !== "0";
function dlog(...args: any[]) { if (DEBUG) console.log("[AUTH]", ...args); }
function derr(...args: any[]) { console.error("[AUTH:ERR]", ...args); }

/**
 * Types
 */
export type User = {
  id: number | string;
  name?: string;
  role?: string;
  email?: string;
  mobile?: string;
  [k: string]: any;
};

export type LoginResponse = {
  ok?: boolean;
  success?: boolean;
  token?: string;            // JWT from backend
  user?: User;               // optional user payload
  tenant_id?: number|string; // optional; may also live in JWT
  userRole?: string;         // e.g., "Admin"
  userName?: string;         // e.g., "John Doe"
  user_id?: number;          // e.g., 1
  mobile?: string;           // e.g., "8123945138"
  [k: string]: any;
};

/**
 * Small JWT decoder (no external deps)
 */
type DecodedJWT = {
  user_id?: number;
  userRole?: string;
  userName?: string;
  tenant_id?: number;
  mobile?: string | number;
  exp?: number; // seconds since epoch
  [k: string]: any;
};

function parseJwt<T = any>(token?: string | null): T | null {
	if (!token) return null;
	try {
		const base64Url = token.split(".")[1];
		const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split("")
				.map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
				.join("")
		);
		return JSON.parse(jsonPayload) as T;
	} catch (e) {
		derr("JWT decode failed", e);
		return null;
	}
}

/**
 * Token helpers (JWT)
 */
export function getToken(): string | null {
	if (inMemoryToken) return inMemoryToken;
	const token = localStorage.getItem("authToken");
	if (token) inMemoryToken = token;
	return token;
}

export function setToken(token: string | null) {
	dlog("setToken", !!token);
	inMemoryToken = token; // Update in-memory token
	if (token) {
		localStorage.setItem("authToken", token);
	} else {
		localStorage.removeItem("authToken");
	}
}

export function authHeader(): { Authorization?: string } {
	const t = getToken();
	return t ? { Authorization: `Bearer ${t}` } : {};
}

/**
 * User + tenant helpers (client cache)
 */
export function getUser(): User | null {
	return inMemoryUser;
}

export function setUser(user: User | null) {
	dlog("setUser", user ? { id: user.id, role: user.role, name: user.name, mobile: user.mobile } : null);
	inMemoryUser = user;
}

export function getUserMobile(): string | null {
	const u = getUser();
	const m = (u as any)?.mobile ?? "";
	const s = String(m || "").trim();
	return s || null;
}

export function getUserName(): string | null {
	const u = getUser();
	return u?.name ?? null;
}

export function getUserRole(): string | null {
	const u = getUser();
	return u?.role ?? null;
}

export function getUserId(): string | null {
	const u = getUser();
	return u ? String(u.id) : null;
}

export function getTenantId(): string | null {
	return inMemoryTenantId;
}

export function setTenantId(tenantId: string | number | null) {
	dlog("setTenantId", tenantId);
	inMemoryTenantId = tenantId ? String(tenantId) : null;
}

export function isAuthenticated(): boolean {
	return !!getToken();
}

export function clearAuth() {
	setToken(null);
	setUser(null);
	setTenantId(null);
}

/** Back-compat alias */
export function clearSessionCache() { clearAuth(); }

/**
 * GET SESSION
 * Hit the /me endpoint to re-hydrate the session from a valid cookie.
 */
export async function getSession(): Promise<LoginResponse> {
	dlog("getSession → /me");
	try {
		const { data } = await http.get<LoginResponse>("/me");
		dlog("getSession ←", { ok: data?.ok, hasToken: !!data?.token, user: data?.user });

		if (data?.ok) {
			// If backend returns a new token (e.g., refreshed), update it
			if (data.token) setToken(data.token);

			// If user object is in response, cache it
			if (data.user) setUser(data.user);

			// If tenant_id is in response, cache it
			if (data.tenant_id) setTenantId(data.tenant_id);
		} else {
			// If /me returns ok:false, the cookie is invalid, so clear everything
			clearAuth();
		}
		return data;
	} catch (e) {
		derr("getSession failed", e);
		clearAuth(); // Also clear on network/server error
		return { ok: false, success: false };
	}
}

/**
 * LOGIN
 * Works with either { email, password } or { mobile, password }.
 * Your backend returns:
 * {
 *   success: true,
 *   token: "...",
 *   userRole: "Admin",
 *   userName: "John Doe",
 *   user_id: 1,
 *   mobile: "8123945138",
 *   tenant_id?: 1
 * }
 */
export async function login(
	identifier: string, // email OR mobile
	password: string
): Promise<LoginResponse> {
	const payload: any = identifier.includes("@")
		? { email: identifier, password }
		: { mobile: identifier, password };

	dlog("login → /login", payload);

	const { data } = await http.post<LoginResponse>("/login", payload);
	dlog("login ←", {
		success: data?.success, ok: data?.ok, hasToken: !!data?.token,
		user_id: data?.user_id, userRole: data?.userRole, userName: data?.userName, mobile: data?.mobile,
		tenant_id: data?.tenant_id
	});



	if (data?.token) setToken(data.token);

	// tenant_id: prefer response, fallback to JWT
	let tenantFromResp = data?.tenant_id;
	if (tenantFromResp === undefined || tenantFromResp === null) {
		const decoded = parseJwt<DecodedJWT>(data?.token);
		tenantFromResp = decoded?.tenant_id;
	}
	if (tenantFromResp !== undefined && tenantFromResp !== null) {
		setTenantId(tenantFromResp as any);
	}

	// Build user cache from response (top-level fields) or from JWT
	const decoded = parseJwt<DecodedJWT>(data?.token);
	const user: User = {
		id: data?.user?.id ?? data?.user_id ?? decoded?.user_id ?? "unknown",
		name: data?.user?.name ?? data?.userName ?? decoded?.userName,
		role: data?.user?.role ?? data?.userRole ?? decoded?.userRole,
		mobile: data?.user?.mobile ?? data?.mobile ?? (decoded?.mobile ? String(decoded.mobile) : undefined),
		email: data?.user?.email,
	};
	setUser(user);

	dlog("post-login snapshot", getDebugState());
	return data;
}

/**
 * LOGOUT
 */
export async function logout(): Promise<void> {
	try { await http.post("/logout"); } catch { /* ignore */ }
	clearAuth();
}

/**
 * Bootstrap current user primarily from JWT.
 * If user cache is missing and token decodes cleanly, we populate from JWT.
 * Only if still missing, TRY /me as a final fallback (optional endpoint).
 */
export async function refreshMe(): Promise<{ user: User | null; tenant_id: string | null }> {
	const token = getToken();
	dlog("refreshMe tokenPresent", !!token);
	if (!token) { clearAuth(); return { user: null, tenant: null }; }

	const cached = getUser();
	if (cached?.id || cached?.role || (cached as any)?.mobile) {
		dlog("refreshMe using cached user", cached);
		return { user: cached, tenant_id: getTenantId() };
	}

	const d = parseJwt<DecodedJWT>(token);
	if (d) {
		const userFromJwt: User = {
			id: d.user_id ?? "unknown",
			name: d.userName,
			role: d.userRole,
			mobile: d.mobile ? String(d.mobile) : undefined,
		};
		setUser(userFromJwt);

		if (d.tenant_id !== undefined && d.tenant_id !== null) setTenantId(d.tenant_id);
		dlog("refreshMe built from JWT", { userFromJwt, tenant: d.tenant_id });

		return { user: getUser(), tenant_id: getTenantId() };
	}

	// Optional /me fallback (only if your backend provides it)
	try {
		const { data } = await http.get<{ ok: boolean; user?: User; tenant_id?: string | number }>("/me", {
			headers: authHeader(),
		});
		if (data?.user) setUser(data.user);
		if (data?.tenant_id !== undefined) setTenantId(data.tenant_id!); // Use setTenantId to store in localStorage
		dlog("refreshMe fetched /me", { user: data?.user, tenant: data?.tenant_id });
		return { user: getUser(), tenant_id: getTenantId() };
	} catch (e) {
		derr("refreshMe /me failed", e);
		clearAuth(); // Clear local storage if /me fails (session invalid)
		return { user: null, tenant_id: null };
	}
}
/**
 * One-shot init for app start (JWT-first bootstrap)
 */
export async function initAuth(): Promise<{ user: User | null; tenant_id: string | null }> {
	const { ok, user, tenant_id } = await getSession();
	return { user: ok ? user : null, tenant_id: ok ? tenant_id : null };
}

/**
 * Handy debug snapshot for a quick glance in DevTools
 */
export function getDebugState() {
	const token = getToken();
	const decoded = parseJwt<DecodedJWT>(token);
	const now = Math.floor(Date.now() / 1000);
	const exp = decoded?.exp ?? null;
	return {
		httpBase: (import.meta as any)?.env?.VITE_API_BASE || "http://127.0.0.1:5000/api",
		tokenPresent: !!token,
		tokenExpISO: exp ? new Date(exp * 1000).toISOString() : null,
		tokenExpiresInSec: exp ? exp - now : null,
		cacheUser: getUser(),
		tenantId: getTenantId(),
		decodedClaims: decoded,
	};
}
