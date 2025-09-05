export const DEBUG = (import.meta.env.VITE_DEBUG ?? '1') === '1';

export function dlog(...args: any[]) {
	if (DEBUG) console.log('[APP]', ...args);
}
export function derr(...args: any[]) {
	console.error('[APP:ERR]', ...args);
}

/** Mask a Bearer token in logs */
export function maskToken(t?: string | null) {
	if (!t) return '(none)';
	return `${t.slice(0, 12)}...${t.slice(-8)} (${t.length} chars)`;
}
