import { describe, expect, it } from "vitest";
import { createStanzaAdapter } from "#/lib/xmpp/client";
import type { XmppEvent } from "#/types/store";

const enabled = process.env.XMPP_INTEGRATION === "1";
const websocketUrl =
	process.env.XMPP_WEBSOCKET_URL ?? "ws://localhost:5280/xmpp-websocket";

describe.skipIf(!enabled)("stanza adapter integration", () => {
	it("connects two clients and delivers a message", async () => {
		const alice = createStanzaAdapter();
		const bob = createStanzaAdapter();
		const aliceEvents: XmppEvent[] = [];
		const bobEvents: XmppEvent[] = [];
		alice.subscribe((event) => aliceEvents.push(event));
		bob.subscribe((event) => bobEvents.push(event));

		await alice.connect({
			jid: "alice@localhost",
			password: "alice123",
			websocketUrl,
		});
		await bob.connect({
			jid: "bob@localhost",
			password: "bob123",
			websocketUrl,
		});

		await waitFor(
			() =>
				bobEvents.some(
					(event) =>
						event.type === "connection" && event.status === "connected",
				),
			5_000,
		);

		await alice.sendMessage({
			to: "bob@localhost",
			body: "integration ping",
			id: "integration-1",
		});

		const received = await waitFor(
			() =>
				bobEvents.find(
					(event) =>
						event.type === "message" &&
						event.message.body === "integration ping",
				),
			5_000,
		);

		expect(received).toBeDefined();
		if (received?.type === "message") {
			expect(received.message.direction).toBe("incoming");
			expect(received.message.conversationJid).toBe("alice@localhost");
		}

		const receipt = await waitFor(
			() =>
				aliceEvents.find(
					(event) =>
						event.type === "message-status" &&
						event.id === "integration-1" &&
						event.status === "delivered",
				),
			5_000,
		);
		expect(receipt).toBeDefined();

		await alice.sendMessage({
			to: "bob@localhost",
			body: "integration reply",
			id: "integration-2",
			replyTo: { id: "integration-1", to: "bob@localhost" },
		});
		const reply = await waitFor(
			() =>
				bobEvents.find(
					(event) =>
						event.type === "message" && event.message.id === "integration-2",
				),
			5_000,
		);
		expect(reply.type === "message" && reply.message.replyTo?.id).toBe(
			"integration-1",
		);

		await alice.sendReaction("bob@localhost", "integration-1", ["👍"]);
		const reaction = await waitFor(
			() =>
				bobEvents.find(
					(event) =>
						event.type === "reactions" && event.messageId === "integration-1",
				),
			5_000,
		);
		expect(reaction.type === "reactions" && reaction.reactions).toEqual(["👍"]);

		await alice.sendMessage({
			to: "bob@localhost",
			body: "original edit",
			id: "integration-edit-1",
		});
		await alice.sendMessage({
			to: "bob@localhost",
			body: "edited body",
			id: "integration-edit-1",
			editId: "integration-edit-1",
		});
		const edit = await waitFor(
			() =>
				bobEvents.find(
					(event) =>
						event.type === "edit" &&
						event.messageId === "integration-edit-1" &&
						event.body === "edited body",
				),
			5_000,
		);
		expect(edit).toBeDefined();

		await alice.disconnect();
		await bob.disconnect();
	}, 20_000);
});

async function waitFor<T>(
	check: () => T | undefined,
	timeoutMs: number,
): Promise<T> {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		const result = check();
		if (result) return result;
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
	throw new Error("Timed out waiting for XMPP event");
}
