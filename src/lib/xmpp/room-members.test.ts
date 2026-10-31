import { describe, expect, it } from "vitest";
import { selectOpenInvites, selectRoomMembers } from "#/lib/xmpp/room-members";
import type { RoomState } from "#/types/chat";

const room: RoomState = {
	jid: "team@conference.example.com",
	name: "Team",
	nick: "alice",
	occupants: {
		alice: {
			nick: "alice",
			jid: "alice@example.com",
			presence: { show: "available", priority: 0 },
		},
	},
	invites: {
		"bob@example.com": {
			jid: "bob@example.com",
			name: "Bob",
			status: "accepted",
			invitedAt: 1,
			invitedBy: "alice@example.com",
		},
	},
};

describe("selectRoomMembers", () => {
	it("keeps accepted invitees visible when they are not online", () => {
		const members = selectRoomMembers(room);

		expect(members.map((member) => member.name)).toEqual(["alice", "Bob"]);
		expect(members.find((member) => member.name === "Bob")).toMatchObject({
			jid: "bob@example.com",
			online: false,
		});
	});

	it("does not duplicate an accepted invitee who is currently present", () => {
		const members = selectRoomMembers({
			...room,
			occupants: {
				...room.occupants,
				bob: {
					nick: "bob",
					jid: "bob@example.com",
					presence: { show: "chat", priority: 0 },
				},
			},
		});

		expect(members).toHaveLength(2);
		expect(
			members.find((member) => member.jid === "bob@example.com"),
		).toMatchObject({
			name: "bob",
			online: true,
		});
	});

	it("does not include pending invitees as members", () => {
		const members = selectRoomMembers({
			...room,
			invites: {
				...room.invites,
				"carol@example.com": {
					jid: "carol@example.com",
					status: "pending",
					invitedAt: 2,
				},
			},
		});

		expect(members.some((member) => member.jid === "carol@example.com")).toBe(
			false,
		);
	});

	it("keeps pending invitees out of members even when the server lists them", () => {
		const members = selectRoomMembers({
			...room,
			invites: {
				...room.invites,
				"carol@example.com": {
					jid: "carol@example.com",
					status: "pending",
					invitedAt: 2,
				},
			},
			memberJids: [
				"alice@example.com",
				"carol@example.com",
				"dave@example.com",
			],
		});

		expect(members.map((member) => member.jid)).toEqual([
			"alice@example.com",
			"bob@example.com",
			"dave@example.com",
		]);
	});

	it("lists open invites that have not joined yet, excluding accepted and present invitees", () => {
		const invites = selectOpenInvites({
			...room,
			invites: {
				...room.invites,
				"carol@example.com": {
					jid: "carol@example.com",
					status: "pending",
					invitedAt: 2,
				},
				"dave@example.com": {
					jid: "dave@example.com",
					status: "pending",
					invitedAt: 3,
				},
				"erin@example.com": {
					jid: "erin@example.com",
					status: "declined",
					invitedAt: 4,
				},
			},
			occupants: {
				...room.occupants,
				dave: {
					nick: "dave",
					jid: "dave@example.com",
					presence: { show: "chat", priority: 0 },
				},
			},
		});

		expect(invites.map((invite) => invite.jid)).toEqual([
			"carol@example.com",
			"erin@example.com",
		]);
	});
});
