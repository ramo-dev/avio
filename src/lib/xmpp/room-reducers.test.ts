import { describe, expect, it } from "vitest";
import { OFFLINE_PRESENCE } from "#/lib/xmpp/presence";
import { createInitialState, reduceEvent } from "#/lib/xmpp/reducers";

const room = {
	jid: "team@conference.example.com",
	name: "Team",
	nick: "alice",
	occupants: {},
	invites: {},
};

describe("room reducers", () => {
	it("creates a group conversation when a room is joined", () => {
		const state = reduceEvent(createInitialState(), { type: "room", room });

		expect(state.rooms[room.jid]?.name).toBe("Team");
		expect(state.conversations[room.jid]).toMatchObject({
			kind: "group",
			title: "Team",
			nick: "alice",
		});
	});

	it("tracks occupants joining and leaving", () => {
		let state = reduceEvent(createInitialState(), { type: "room", room });
		state = reduceEvent(state, {
			type: "room-occupant",
			jid: room.jid,
			action: "join",
			occupant: {
				nick: "bob",
				jid: "bob@example.com",
				presence: OFFLINE_PRESENCE,
			},
		});

		expect(state.rooms[room.jid]?.occupants.bob?.jid).toBe("bob@example.com");

		state = reduceEvent(state, {
			type: "room-occupant",
			jid: room.jid,
			action: "leave",
			occupant: { nick: "bob", presence: OFFLINE_PRESENCE },
		});
		expect(state.rooms[room.jid]?.occupants.bob).toBeUndefined();
	});

	it("tracks pending invites and marks them accepted when the invitee joins", () => {
		let state = reduceEvent(createInitialState(), { type: "room", room });
		state = reduceEvent(state, {
			type: "room-invites",
			jid: room.jid,
			invites: [
				{
					jid: "bob@example.com",
					name: "Bob",
					status: "pending",
					invitedAt: 1000,
				},
			],
		});
		expect(state.rooms[room.jid]?.invites["bob@example.com"]?.status).toBe(
			"pending",
		);

		state = reduceEvent(state, {
			type: "room-occupant",
			jid: room.jid,
			action: "join",
			occupant: {
				nick: "bob",
				jid: "bob@example.com",
				presence: OFFLINE_PRESENCE,
			},
		});
		expect(state.rooms[room.jid]?.invites["bob@example.com"]?.status).toBe(
			"accepted",
		);
	});

	it("keeps known occupants when an empty room snapshot arrives", () => {
		let state = reduceEvent(createInitialState(), { type: "room", room });
		for (const nick of ["alice", "bob"]) {
			state = reduceEvent(state, {
				type: "room-occupant",
				jid: room.jid,
				action: "join",
				occupant: {
					nick,
					jid: `${nick}@example.com`,
					presence: OFFLINE_PRESENCE,
				},
			});
		}

		state = reduceEvent(state, {
			type: "room",
			room: { ...room, occupants: {}, membership: "joining" },
		});

		expect(Object.keys(state.rooms[room.jid]?.occupants ?? {})).toEqual([
			"alice",
			"bob",
		]);
	});

	it("marks a declined invitation", () => {
		let state = reduceEvent(createInitialState(), { type: "room", room });
		state = reduceEvent(state, {
			type: "room-invites",
			jid: room.jid,
			invites: [
				{
					jid: "bob@example.com",
					status: "pending",
					invitedAt: 1000,
					invitedBy: "alice@example.com",
				},
			],
		});

		state = reduceEvent(state, {
			type: "room-invite-declined",
			roomJid: room.jid,
			from: "bob@example.com",
		});

		expect(state.rooms[room.jid]?.invites["bob@example.com"]?.status).toBe(
			"declined",
		);
	});

	it("updates the subject and removes a left room", () => {
		let state = reduceEvent(createInitialState(), { type: "room", room });
		state = reduceEvent(state, {
			type: "room-subject",
			jid: room.jid,
			subject: "Ship it",
		});
		expect(state.rooms[room.jid]?.subject).toBe("Ship it");

		state = reduceEvent(state, { type: "room-left", jid: room.jid });
		expect(state.rooms[room.jid]).toBeUndefined();
		expect(state.conversations[room.jid]).toBeUndefined();
	});
});
