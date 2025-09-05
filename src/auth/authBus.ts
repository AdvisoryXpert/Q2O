// In-memory only (clears on refresh)
export type AuthLite = {
  id: number | string;
  mobile: string;
  role?: string;
  name?: string;
};

let current: AuthLite | null = null;
const listeners = new Set<(u: AuthLite | null) => void>();

export function setAuthFromLogin(resp: {
  user_id: number | string;
  mobile: string | number;
  userRole?: string;
  userName?: string;
}) {
	current = {
		id: resp.user_id,
		mobile: String(resp.mobile),
		role: resp.userRole,
		name: resp.userName,
	};
	for (const fn of listeners) fn(current);
}

export function clearAuthInMemory() {
	current = null;
	for (const fn of listeners) fn(current);
}

export function getAuthLite(): AuthLite | null {
	return current;
}

export function subscribeAuth(fn: (u: AuthLite | null) => void) {
	listeners.add(fn);
	// push current value immediately
	fn(current);
	return () => listeners.delete(fn);
}
