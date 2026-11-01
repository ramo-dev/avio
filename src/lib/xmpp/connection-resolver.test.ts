// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	buildWebSocketCandidates,
	probeWebSocket,
} from "#/lib/xmpp/connection-resolver";

describe("buildWebSocketCandidates", () => {
	it("probes the given host and port on both schemes first", () => {
		const candidates = buildWebSocketCandidates({
			domain: "example.com",
			host: "chat.example.com",
			port: 7443,
		});
		expect(candidates.slice(0, 4)).toEqual([
			"wss://chat.example.com:7443/xmpp-websocket",
			"wss://chat.example.com:7443/ws",
			"wss://chat.example.com:7443/websocket",
			"wss://chat.example.com:7443/",
		]);
		expect(candidates[4]).toBe("ws://chat.example.com:7443/xmpp-websocket");
	});

	it("falls back to conventional endpoints for the domain", () => {
		const candidates = buildWebSocketCandidates({ domain: "example.com" });
		expect(candidates[0]).toBe("wss://example.com/xmpp-websocket");
		expect(candidates).toContain("wss://example.com:5281/xmpp-websocket");
		expect(candidates).toContain("wss://example.com:5443/ws");
		expect(candidates).toContain("ws://example.com:5280/xmpp-websocket");
	});
});

describe("probeWebSocket", () => {
	it("rejects an invalid URL without throwing", async () => {
		expect(await probeWebSocket("not a url", 50)).toBe(false);
	});
});
