import { describe, expect, it } from "vitest";
import { createMemoryRoomReactionStore } from "#/lib/storage/room-reactions";
import { createInitialState } from "#/lib/xmpp/initial-state";
import { reduceEvent } from "#/lib/xmpp/reducers";
import {
	changedReactionKeys,
	createRoomReactionsKeeper,
} from "#/lib/xmpp/room-reactions-snapshot";
import type { ChatMessage } from "#/types/chat";
import type { XmppEvent, XmppState } from "#/types/store";

const ROOM = "dev@conference.example.com";

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
	return {
		id: "stanza-1",
		stanzaId: "server-1",
		conversationJid: ROOM,
		from: ROOM,
		to: "lisa@example.com",
		body: "hello",
		timestamp: 1_000,
		direction: "incoming",
		status: "delivered",
		...overrides,
	};
}

function stateWith(messages: ChatMessage[]): XmppState {
	const state = createInitialState();
	return {
		...state,
		rooms: {
			[ROOM]: {
				jid: ROOM,
				name: "Dev",
				nick: "lisa",
				occupants: {
					mary: {
						nick: "mary",
						jid: "mary@example.com",
						presence: { show: "available", priority: 0 },
					},
				},
				invites: {},
			},
		},
		conversations: {
			...state.conversations,
			[ROOM]: {
				...state.conversations[ROOM],
				kind: "group",
				messages,
			},
		},
	};
}

function note(
	keeper: ReturnType<typeof createRoomReactionsKeeper>,
	event: XmppEvent,
	before: XmppState,
	after: XmppState,
): XmppState {
	return keeper.note(event, before, after);
}

describe("changedReactionKeys", () => {
	it("detects added, updated, and removed senders", () => {
		const before = message({
			reactions: { a: ["👍"], b: ["❤️"], c: ["😄"] },
		});
		const after = message({
			reactions: { a: ["👍", "🔥"], b: ["❤️"], x: ["😭"] },
		});
		expect(changedReactionKeys(before, after).sort()).toEqual(["a", "c", "x"]);
	});
});

describe("createRoomReactionsKeeper", () => {
	it("records group reactions and restores them on replay", () => {
		const store = createMemoryRoomReactionStore();
		const keeper = createRoomReactionsKeeper(store);

		const before = stateWith([message({ reactions: undefined })]);
		const reactionEvent: XmppEvent = {
			type: "reactions",
			jid: ROOM,
			messageId: "stanza-1",
			senderJid: `${ROOM}/mary`,
			senderNick: "mary",
			reactions: ["👍"],
		};
		// In production the reducer applies the reaction to the incoming state
		// before the keeper records it; mirror that here with the resolved key.
		const after = stateWith([
			message({ reactions: { "mary@example.com": ["👍"] } }),
		]);
		note(keeper, reactionEvent, before, after);

		// Reacting to a message already applied to the state is not the keeper's
		// job; the snapshot only records what changed so it can survive a replay.
		const snapshot = store.load()[ROOM];
		expect(Object.keys(snapshot["server-1"])).toEqual(["mary@example.com"]);
	});

	it("fills snapshot reactions back into a replayed message", () => {
		const store = createMemoryRoomReactionStore();
		const keeper = createRoomReactionsKeeper(store);
		keeper.note(
			{
				type: "reactions",
				jid: ROOM,
				messageId: "stanza-1",
				senderJid: `${ROOM}/mary`,
				senderNick: "mary",
				reactions: ["👍"],
			},
			stateWith([message({})]),
			stateWith([message({ reactions: { "mary@example.com": ["👍"] } })]),
		);

		// Replays arrive without the reaction (the server does not archive it).
		const replayed = stateWith([message({ reactions: undefined })]);
		const restored = note(
			keeper,
			{ type: "message", message: message({ reactions: undefined }) },
			replayed,
			replayed,
		);
		expect(
			restored.conversations[ROOM].messages[0]?.reactions?.["mary@example.com"],
		).toEqual(["👍"]);
	});

	it("never overrides a delivered reaction", () => {
		const store = createMemoryRoomReactionStore();
		const keeper = createRoomReactionsKeeper(store);
		keeper.note(
			{
				type: "reactions",
				jid: ROOM,
				messageId: "stanza-1",
				senderJid: `${ROOM}/mary`,
				senderNick: "mary",
				reactions: ["👍"],
			},
			stateWith([message({})]),
			stateWith([message({ reactions: { "mary@example.com": ["👍"] } })]),
		);

		// A newer server replay already carries a different map for the sender.
		const replayed = stateWith([
			message({ reactions: { "mary@example.com": ["😄", "🎉"] } }),
		]);
		const restored = note(
			keeper,
			{ type: "message", message: message({}) },
			replayed,
			replayed,
		);
		expect(
			restored.conversations[ROOM].messages[0]?.reactions?.["mary@example.com"],
		).toEqual(["😄", "🎉"]);
	});

	it("keeps reactions for messages without stanza ids by local id", () => {
		const store = createMemoryRoomReactionStore();
		const keeper = createRoomReactionsKeeper(store);
		keeper.note(
			{
				type: "reactions",
				jid: ROOM,
				messageId: "local-only",
				senderJid: `${ROOM}/mary`,
				senderNick: "mary",
				reactions: ["👍"],
			},
			stateWith([message({ id: "local-only", stanzaId: undefined })]),
			stateWith([
				message({
					id: "local-only",
					stanzaId: undefined,
					reactions: { "mary@example.com": ["👍"] },
				}),
			]),
		);
		expect(store.load()[ROOM]["local-only"]).toEqual({
			"mary@example.com": ["👍"],
		});
	});

	it("applies reactions through the event reducer with occupant values", () => {
		const base = stateWith([message({})]);
		const reactionsEvent: XmppEvent = {
			type: "reactions",
			jid: ROOM,
			messageId: "stanza-1",
			senderJid: `${ROOM}/mary`,
			senderNick: "mary",
			reactions: ["👍"],
		};
		const next = reduceEvent(base, reactionsEvent);
		expect(
			next.conversations[ROOM].messages[0]?.reactions?.["mary@example.com"],
		).toEqual(["👍"]);
	});
});
