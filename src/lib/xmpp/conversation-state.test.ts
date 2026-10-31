import { describe, expect, it } from "vitest";
import {
	deleteConversationState,
	ensureConversationState,
	markAllReadState,
	markConversationUnreadState,
} from "#/lib/xmpp/conversation-state";
import { createInitialState, reduceEvent } from "#/lib/xmpp/reducers";

function stateWithMessage() {
	const base = createInitialState();
	return reduceEvent(base, {
		type: "message",
		message: {
			id: "m1",
			conversationJid: "bob@example.com",
			from: "bob@example.com/phone",
			to: "alice@example.com/web",
			body: "Hello",
			timestamp: 1000,
			direction: "incoming",
			status: "delivered",
		},
	});
}

describe("conversation state", () => {
	it("creates an empty conversation and contact", () => {
		const state = ensureConversationState(
			createInitialState(),
			"bob@example.com",
		);
		expect(state.conversations["bob@example.com"]?.messages).toHaveLength(0);
		expect(state.contacts["bob@example.com"]).toBeDefined();
	});

	it("marks one or all conversations unread", () => {
		const initial = stateWithMessage();
		expect(initial.conversations["bob@example.com"]?.unread).toBe(1);

		const marked = markConversationUnreadState(initial, "bob@example.com");
		expect(marked.conversations["bob@example.com"]?.unread).toBe(1);

		const read = markAllReadState(marked);
		expect(read.conversations["bob@example.com"]?.unread).toBe(0);
	});

	it("deletes the local conversation and contact", () => {
		const state = deleteConversationState(
			stateWithMessage(),
			"bob@example.com",
		);
		expect(state.conversations["bob@example.com"]).toBeUndefined();
		expect(state.contacts["bob@example.com"]).toBeUndefined();
	});

	it("does not create a direct contact for group history", () => {
		const state = reduceEvent(createInitialState(), {
			type: "history",
			messages: [
				{
					id: "room-m1",
					conversationJid: "room@conference.example.com",
					from: "room@conference.example.com/bob",
					to: "alice@example.com/web",
					body: "Hello room",
					timestamp: 1000,
					direction: "incoming",
					status: "delivered",
					senderNick: "bob",
				},
			],
		});

		expect(state.conversations["room@conference.example.com"]?.kind).toBe(
			"group",
		);
		expect(state.contacts["room@conference.example.com"]).toBeUndefined();
	});
});
