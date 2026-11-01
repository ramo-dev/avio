// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverConnectionEndpoints } from "#/lib/xmpp/discovery";

function jsonResponse(body: unknown, status = 200) {
	return new Response(typeof body === "string" ? body : JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("discoverConnectionEndpoints", () => {
	it("parses host-meta.json websocket and bosh links", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				jsonResponse({
					links: [
						{
							rel: "urn:xmpp:alt-connections:websocket",
							href: "wss://example.com/xmpp-websocket",
						},
						{
							rel: "urn:xmpp:alt-connections:xbosh",
							href: "https://example.com/http-bind",
						},
					],
				}),
			),
		);
		const result = await discoverConnectionEndpoints("example.com");
		expect(result).toEqual({
			found: true,
			websocket: "wss://example.com/xmpp-websocket",
			bosh: "https://example.com/http-bind",
		});
	});

	it("falls back to XML host-meta", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => {
				if (url.endsWith("host-meta.json")) {
					return jsonResponse("nope", 404);
				}
				return new Response(
					'<XRD><Link rel="urn:xmpp:alt-connections:websocket" href="wss://example.com/ws"/></XRD>',
					{ headers: { "content-type": "application/xrd+xml" } },
				);
			}),
		);
		const result = await discoverConnectionEndpoints("example.com");
		expect(result.found).toBe(true);
		expect(result.websocket).toBe("wss://example.com/ws");
		expect(result.bosh).toBeUndefined();
	});

	it("rejects unusable schemes and domains", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				jsonResponse({
					links: [
						{
							rel: "urn:xmpp:alt-connections:websocket",
							href: "javascript:alert(1)",
						},
					],
				}),
			),
		);
		await expect(discoverConnectionEndpoints("example.com")).rejects.toThrow(
			"No WebSocket or BOSH endpoint",
		);
		await expect(discoverConnectionEndpoints("not a domain")).rejects.toThrow(
			"valid JID",
		);
	});
});
