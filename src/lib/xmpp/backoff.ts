export const RECONNECT_BASE_MS = 1000;
export const RECONNECT_MAX_MS = 30_000;

export function reconnectDelay(attempt: number): number {
	const exponential = Math.min(
		RECONNECT_MAX_MS,
		RECONNECT_BASE_MS * 2 ** Math.max(0, attempt),
	);
	const jitter = Math.floor(Math.random() * 250);
	return Math.min(RECONNECT_MAX_MS, exponential + jitter);
}
