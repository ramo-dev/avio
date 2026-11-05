export const RECONNECT_BASE_MS = 1000;
export const RECONNECT_MAX_MS = 30_000;
/** Stop reconnecting after this many failed attempts instead of looping forever. */
export const MAX_RECONNECT_ATTEMPTS = 5;

export function reconnectDelay(attempt: number): number {
	const exponential = Math.min(
		RECONNECT_MAX_MS,
		RECONNECT_BASE_MS * 2 ** Math.max(0, attempt),
	);
	const jitter = Math.floor(Math.random() * 250);
	return Math.min(RECONNECT_MAX_MS, exponential + jitter);
}
