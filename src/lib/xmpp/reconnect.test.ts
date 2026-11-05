import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_RECONNECT_ATTEMPTS } from "#/lib/xmpp/backoff";
import { createReconnectController } from "#/lib/xmpp/reconnect";

const credentials = { jid: "alice@example.com", password: "secret" };

describe("createReconnectController", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("keeps only one timer when disconnect fires repeatedly", () => {
		const connect = vi.fn().mockResolvedValue(undefined);
		const controller = createReconnectController({
			connect,
			getCredentials: () => credentials,
			isConnecting: () => false,
			onReconnecting: vi.fn(),
			onExhausted: vi.fn(),
			delay: () => 10,
		});

		controller.schedule();
		controller.schedule();
		controller.schedule();
		vi.advanceTimersByTime(10);

		expect(connect).toHaveBeenCalledTimes(1);
		expect(connect).toHaveBeenCalledWith(credentials, true);
	});

	it("stops after the attempt limit instead of retrying forever", () => {
		const connect = vi.fn().mockResolvedValue(undefined);
		const onExhausted = vi.fn();
		const onReconnecting = vi.fn();
		const controller = createReconnectController({
			connect,
			getCredentials: () => credentials,
			isConnecting: () => false,
			onReconnecting,
			onExhausted,
			delay: () => 10,
		});

		for (let attempt = 0; attempt <= MAX_RECONNECT_ATTEMPTS; attempt++) {
			controller.schedule();
			vi.advanceTimersByTime(10);
		}

		expect(connect).toHaveBeenCalledTimes(MAX_RECONNECT_ATTEMPTS);
		expect(onReconnecting).toHaveBeenCalledTimes(MAX_RECONNECT_ATTEMPTS);
		expect(onExhausted).toHaveBeenCalledTimes(1);
		expect(controller.isStopped()).toBe(true);
	});

	it("resets after a successful session so future drops can reconnect", () => {
		const connect = vi.fn().mockResolvedValue(undefined);
		const controller = createReconnectController({
			connect,
			getCredentials: () => credentials,
			isConnecting: () => false,
			onReconnecting: vi.fn(),
			onExhausted: vi.fn(),
			delay: () => 10,
		});

		for (let attempt = 0; attempt <= MAX_RECONNECT_ATTEMPTS; attempt++) {
			controller.schedule();
			vi.advanceTimersByTime(10);
		}
		expect(controller.isStopped()).toBe(true);

		controller.reset();
		controller.schedule();
		vi.advanceTimersByTime(10);

		expect(controller.isStopped()).toBe(false);
		expect(connect).toHaveBeenCalledTimes(MAX_RECONNECT_ATTEMPTS + 1);
	});
});
