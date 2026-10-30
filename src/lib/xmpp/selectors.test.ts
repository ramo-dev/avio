import { describe, expect, it } from "vitest";
import { OFFLINE_PRESENCE } from "#/lib/xmpp/presence";
import { createInitialState, reduceEvent } from "#/lib/xmpp/reducers";
import { selectConversationSummaries } from "#/lib/xmpp/selectors";

describe("conversation selectors", () => {
	it("carries roster groups into conversation summaries", () => {
		const state = reduceEvent(createInitialState(), {
			type: "roster",
			contacts: [
				{
					jid: "bob@example.com",
					name: "Bob",
					subscription: "both",
					groups: ["Work", "Friends"],
					presence: OFFLINE_PRESENCE,
				},
			],
		});

		const summary = selectConversationSummaries(state).find(
			(entry) => entry.jid === "bob@example.com",
		);

		expect(summary?.kind).toBe("direct");
	});

	it("defaults to no groups for conversations without a roster entry", () => {
		const state = reduceEvent(createInitialState(), {
			type: "message",
			message: {
				id: "m1",
				conversationJid: "carol@example.com",
				from: "carol@example.com/phone",
				to: "alice@example.com/web",
				body: "Hi",
				timestamp: 1000,
				direction: "incoming",
				status: "delivered",
			},
		});

		const summary = selectConversationSummaries(state).find(
			(entry) => entry.jid === "carol@example.com",
		);

		expect(summary?.kind).toBe("direct");
	});

	it("summarizes a group chat with its participants", () => {
		let state = reduceEvent(createInitialState(), {
			type: "room",
			room: {
				jid: "team@conference.example.com",
				name: "Team",
				nick: "alice",
				occupants: {},
				invites: {},
			},
		});
		for (const [nick, jid] of [
			["alice", "alice@example.com"],
			["bob", "bob@example.com"],
			["carol", "carol@example.com"],
		] as const) {
			state = reduceEvent(state, {
				type: "room-occupant",
				jid: "team@conference.example.com",
				action: "join",
				occupant: {
					nick,
					jid,
					presence: OFFLINE_PRESENCE,
				},
			});
		}

		const summary = selectConversationSummaries(state).find(
			(entry) => entry.jid === "team@conference.example.com",
		);

		expect(summary).toMatchObject({
			kind: "group",
			name: "Team",
			memberCount: 3,
		});
		expect(
			summary?.participants?.map((participant) => participant.name),
		).toEqual(["alice", "bob"]);
	});

	it("does not render a room JID as a direct contact", () => {
		const state = reduceEvent(createInitialState(), {
			type: "room",
			room: {
				jid: "test@conference.example.com",
				name: "Test room",
				nick: "alice",
				occupants: {},
				invites: {},
			},
		});
		const withPresence = reduceEvent(state, {
			type: "presence",
			jid: "test@conference.example.com/bob",
			presence: { show: "available", priority: 0 },
		});

		const summaries = selectConversationSummaries(withPresence).filter(
			(entry) => entry.jid === "test@conference.example.com",
		);

		expect(summaries).toHaveLength(1);
		expect(summaries[0]?.kind).toBe("group");
	});
});
