import type * as StanzaProtocol from "stanza/protocol";
import { describe, expect, it } from "vitest";
import {
	mapHistory,
	mapHistoryActions,
	normalizeStanzaMessage,
} from "#/lib/xmpp/stanza-mappers";

function forwardedMessage(
	overrides: Partial<StanzaProtocol.Message> = {},
): StanzaProtocol.Message {
	return {
		id: "outer-1",
		from: "carol@example.com/phone",
		to: "alice@example.com/web",
		type: "chat",
		body: "",
		forward: {
			message: {
				id: "inner-1",
				from: "bob@example.com/phone",
				to: "carol@example.com",
				type: "chat",
				body: "Original",
			},
		},
		...overrides,
	};
}

describe("stanza mappers", () => {
	it("uses the forwarded message id and body", () => {
		const result = normalizeStanzaMessage(
			forwardedMessage(),
			"alice@example.com",
		);

		expect(result).toMatchObject({
			id: "inner-1",
			stanzaId: "inner-1",
			conversationJid: "carol@example.com",
			body: "Original",
			direction: "incoming",
			forwarded: true,
		});
	});

	it("keeps the forwarded target id when a fallback body is present", () => {
		const result = normalizeStanzaMessage(
			forwardedMessage({ body: "Forwarded" }),
			"alice@example.com",
		);

		expect(result?.id).toBe("inner-1");
		expect(result?.body).toBe("Forwarded");
	});

	it("replays archived reactions and corrections as events", () => {
		const fin: StanzaProtocol.MAMFin = {
			type: "result",
			results: [
				{
					queryId: "q",
					id: "1",
					item: {
						message: {
							id: "m1",
							from: "bob@example.com/phone",
							to: "alice@example.com/web",
							type: "chat",
							body: "Hi",
						},
					},
				},
				{
					queryId: "q",
					id: "2",
					item: {
						message: {
							id: "reaction-1",
							from: "bob@example.com/phone",
							to: "alice@example.com/web",
							type: "chat",
							reactions: { id: "m1", reactions: ["👍"] },
						},
					},
				},
				{
					queryId: "q",
					id: "3",
					item: {
						message: {
							id: "edit-1",
							from: "alice@example.com/web",
							to: "bob@example.com",
							type: "chat",
							body: "Updated",
							replace: "m1",
						},
					},
				},
			],
		};

		expect(mapHistory(fin, "alice@example.com")).toHaveLength(1);
		expect(mapHistoryActions(fin, "alice@example.com")).toEqual([
			{
				type: "reactions",
				jid: "bob@example.com",
				messageId: "m1",
				senderJid: "bob@example.com",
				reactions: ["👍"],
			},
			{
				type: "edit",
				jid: "bob@example.com",
				messageId: "m1",
				body: "Updated",
			},
		]);
	});
});
