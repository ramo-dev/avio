import { useCallback, useEffect, useRef } from "react";

export const OMEMO_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 15_000;

/**
 * Calls `onIdle` after a period without pointer or keyboard activity.
 *
 * Only active while `enabled` is true. The returned `reset` lets callers
 * extend the session after explicit actions such as unlock or send.
 */
export function useOmemoIdleLock(
	enabled: boolean,
	onIdle: () => void,
): () => void {
	const lastActivity = useRef(0);
	const idleCallback = useRef(onIdle);

	useEffect(() => {
		idleCallback.current = onIdle;
	}, [onIdle]);

	const reset = useCallback(() => {
		lastActivity.current = Date.now();
	}, []);

	useEffect(() => {
		if (!enabled) return;
		lastActivity.current = Date.now();
		const interval = setInterval(() => {
			const last = lastActivity.current || Date.now();
			if (Date.now() - last < OMEMO_IDLE_TIMEOUT_MS) return;
			lastActivity.current = Date.now();
			idleCallback.current();
		}, IDLE_CHECK_INTERVAL_MS);
		return () => clearInterval(interval);
	}, [enabled]);

	useEffect(() => {
		if (!enabled) return;
		const activityHandler = () => reset();
		window.addEventListener("pointerdown", activityHandler, { passive: true });
		window.addEventListener("keydown", activityHandler);
		return () => {
			window.removeEventListener("pointerdown", activityHandler);
			window.removeEventListener("keydown", activityHandler);
		};
	}, [enabled, reset]);

	return reset;
}
