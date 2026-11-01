// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	buildServerServiceViews,
	groupServerServices,
	summarizeServerServices,
} from "#/lib/xmpp/server-capability-view";
import type { ServerCapabilities } from "#/types/server-capabilities";

function capabilities(
	overrides: Partial<ServerCapabilities> = {},
): ServerCapabilities {
	return {
		domain: "example.com",
		transport: "websocket",
		tls: true,
		mam: true,
		carbons: true,
		blocking: true,
		vcard: true,
		pep: true,
		muc: "conference.example.com",
		upload: { jid: "uploads.example.com" },
		externalServices: [],
		...overrides,
	};
}

describe("buildServerServiceViews", () => {
	it("flags a plain WS transport as insecure and wss as active", () => {
		const insecure = buildServerServiceViews(capabilities({ tls: false }));
		const transport = insecure.find((service) => service.id === "transport");
		expect(transport?.status).toBe("insecure");

		const secure = buildServerServiceViews(
			capabilities({ transport: "bosh", tls: false }),
		);
		expect(secure.find((service) => service.id === "transport")?.status).toBe(
			"active",
		);
	});

	it("marks advertised services active and missing ones upcoming", () => {
		const views = buildServerServiceViews(
			capabilities({ muc: null, upload: null, mam: false }),
		);
		const byId = new Map(views.map((service) => [service.id, service]));
		expect(byId.get("muc")?.status).toBe("upcoming");
		expect(byId.get("mam")?.status).toBe("upcoming");
		expect(byId.get("carbons")?.status).toBe("active");
		expect(byId.get("srv")?.status).toBe("unsupported");
		expect(byId.get("reactions")?.status).toBe("new");
	});

	it("renders STUN/TURN details when advertised", () => {
		const views = buildServerServiceViews(
			capabilities({
				externalServices: [
					{ type: "stun", host: "stun.example.com", port: 3478 },
				],
			}),
		);
		const stun = views.find((service) => service.id === "stun");
		expect(stun?.status).toBe("active");
		expect(stun?.detail).toBe("stun stun.example.com:3478");
	});
});

describe("groupServerServices", () => {
	it("groups by status in display order and skips empty groups", () => {
		const groups = groupServerServices([
			{
				id: "srv",
				name: "SRV records",
				status: "unsupported",
			},
			{
				id: "transport",
				name: "Transport",
				status: "insecure",
			},
			{
				id: "muc",
				name: "Group chats (MUC)",
				status: "active",
			},
		]);
		expect(groups.map((group) => group.status)).toEqual([
			"insecure",
			"active",
			"unsupported",
		]);
	});
});

describe("summarizeServerServices", () => {
	it("counts attention, active, and upcoming/new services", () => {
		const services = buildServerServiceViews(
			capabilities({ tls: false, mam: false }),
		);
		const summary = summarizeServerServices(services);
		expect(summary.attention).toBe(1);
		expect(summary.upcoming).toBe(3);
	});
});
