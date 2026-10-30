import type * as StanzaProtocol from "stanza/protocol";
import { describe, expect, it } from "vitest";
import {
	mapHistory,
	mapHistoryActions,
	mapRoomHistory,
	mapRoster,
	normalizeGroupMessage,
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

	it("preserves and normalizes roster groups", () => {
		const contacts = mapRoster([
			{
				jid: "bob@example.com/phone",
				subscription: "both",
				groups: [" Work ", "Work", ""],
			},
		]);

		expect(contacts[0]?.jid).toBe("bob@example.com");
		expect(contacts[0]?.groups).toEqual(["Work"]);
	});

	it("normalizes group chat messages with the sender nick", () => {
		const message: StanzaProtocol.Message = {
			id: "g1",
			from: "team@conference.example.com/bob",
			to: "alice@example.com/web",
			type: "groupchat",
			body: "Hello room",
		};

		const incoming = normalizeGroupMessage(
			message,
			"alice@example.com",
			"alice",
		);
		expect(incoming).toMatchObject({
			conversationJid: "team@conference.example.com",
			from: "team@conference.example.com/bob",
			senderNick: "bob",
			direction: "incoming",
			body: "Hello room",
		});

		const own = normalizeGroupMessage(
			{ ...message, from: "team@conference.example.com/alice" },
			"alice@example.com",
			"alice",
		);
		expect(own?.direction).toBe("outgoing");
		expect(own?.senderNick).toBe("alice");
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

	it("maps room MAM results into read-only group previews", () => {
		const fin = {
			results: [
				{
					item: {
						message: {
							id: "room-1",
							from: "room@conference.example/alice",
							to: "bob@example.com/web",
							type: "groupchat",
							body: "room history",
						},
					},
				},
			],
		} as StanzaProtocol.MAMFin;

		const messages = mapRoomHistory(fin, "bob@example.com");

		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatchObject({
			id: "room-1",
			conversationJid: "room@conference.example",
			senderNick: "alice",
			body: "room history",
			direction: "incoming",
		});
	});
});
