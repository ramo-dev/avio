import type { ConnectCredentials } from "#/types/xmpp";
import { MAX_RECONNECT_ATTEMPTS, reconnectDelay } from "./backoff";

interface ReconnectOptions {
	connect: (
		credentials: ConnectCredentials,
		reconnect: boolean,
	) => Promise<void>;
	getCredentials: () => ConnectCredentials | null;
	isConnecting: () => boolean;
	onReconnecting: () => void;
	onExhausted: () => void;
	delay?: (attempt: number) => number;
}

export interface ReconnectController {
	schedule(): void;
	cancel(): void;
	reset(): void;
	stop(): void;
	isStopped(): boolean;
}

/**
 * Owns the reconnect timer. At most one timer and one reconnect attempt can be
 * active; after MAX_RECONNECT_ATTEMPTS the controller stops permanently until
 * a new user-initiated connection resets it.
 */
export function createReconnectController({
	connect,
	getCredentials,
	isConnecting,
	onReconnecting,
	onExhausted,
	delay = reconnectDelay,
}: ReconnectOptions): ReconnectController {
	let attempts = 0;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let stopped = false;

	function cancel() {
		if (!timer) return;
		clearTimeout(timer);
		timer = null;
	}

	function reset() {
		attempts = 0;
		stopped = false;
		cancel();
	}

	function stop() {
		stopped = true;
		cancel();
	}

	function schedule() {
		if (stopped || timer || isConnecting()) return;
		if (!getCredentials()) return;
		if (attempts >= MAX_RECONNECT_ATTEMPTS) {
			stopped = true;
			onExhausted();
			return;
		}

		const attempt = attempts;
		attempts += 1;
		onReconnecting();
		timer = setTimeout(() => {
			timer = null;
			if (stopped || isConnecting()) return;
			const credentials = getCredentials();
			if (!credentials) return;
			void connect(credentials, true).catch(() => undefined);
		}, delay(attempt));
	}

	return {
		schedule,
		cancel,
		reset,
		stop,
		isStopped: () => stopped,
	};
}
