import { describe, expect, it } from "vitest";
import { createStoreHarness } from "#/lib/xmpp/store-test-harness";

const credentials = {
	jid: "alice@example.com",
	password: "secret",
};

describe("group chat store actions", () => {
	it("sends group chat messages as groupchat stanzas", async () => {
		const { store, sent, emit } = createStoreHarness();
		await store.connect(credentials);
		const roomJid = "team@conference.example.com";
		emit({
			type: "room",
			room: {
				jid: roomJid,
				name: "Team",
				nick: "alice",
				occupants: {},
				invites: {},
			},
		});

		const message = await store.sendMessage(roomJid, "Hello room");

		expect(sent.at(-1)).toMatchObject({
			to: roomJid,
			body: "Hello room",
			type: "groupchat",
		});
		expect(message?.status).toBe("sent");
	});

	it("invites new members to an existing room", async () => {
		const { store, adapter, emit, roomInviteStore } = createStoreHarness();
		await store.connect(credentials);
		const roomJid = "team@conference.example.com";
		emit({
			type: "room",
			room: {
				jid: roomJid,
				name: "Team",
				nick: "alice",
				occupants: {},
				invites: {},
			},
		});

		await store.addGroupMembers(roomJid, ["bob@example.com"]);

		expect(adapter.inviteToRoom).toHaveBeenCalledWith(
			roomJid,
			["bob@example.com"],
			"Team",
		);
		expect(
			store.getState().rooms[roomJid]?.invites["bob@example.com"],
		).toMatchObject({
			status: "pending",
		});
		expect(
			roomInviteStore.load("alice@example.com")[roomJid]?.[0],
		).toMatchObject({ jid: "bob@example.com", status: "pending" });

		emit({
			type: "room-occupant",
			jid: roomJid,
			action: "join",
			occupant: {
				nick: "bob",
				jid: "bob@example.com",
				presence: { show: "available", priority: 0 },
			},
		});
		expect(
			roomInviteStore.load("alice@example.com")[roomJid]?.[0]?.status,
		).toBe("accepted");
	});

	it("accepts an invite request and clears it", async () => {
		const { store, adapter, emit } = createStoreHarness();
		await store.connect(credentials);
		const roomJid = "invite@conference.example.com";
		emit({
			type: "room-invite-request",
			request: {
				roomJid,
				roomName: "Invite",
				from: "alice@example.com",
				receivedAt: 1234,
			},
		});

		expect(store.getState().roomInviteRequests).toHaveLength(1);
		await store.acceptRoomInvite(roomJid);

		expect(adapter.acceptRoomInvite).toHaveBeenCalledWith(
			roomJid,
			"Invite",
			"alice@example.com",
		);
		expect(store.getState().roomInviteRequests).toHaveLength(0);
	});

	it("persists and clears incoming invite requests", async () => {
		const { store, emit, roomInviteRequestStore } = createStoreHarness();
		await store.connect(credentials);
		const roomJid = "persist@conference.example.com";
		emit({
			type: "room-invite-request",
			request: {
				roomJid,
				roomName: "Persist",
				from: "alice@example.com",
				receivedAt: 1234,
			},
		});

		expect(roomInviteRequestStore.load("alice@example.com")).toHaveLength(1);

		await store.acceptRoomInvite(roomJid);
		expect(roomInviteRequestStore.load("alice@example.com")).toHaveLength(0);
	});

	it("declines and clears an invite request", async () => {
		const { store, adapter, emit } = createStoreHarness();
		await store.connect(credentials);
		const roomJid = "decline@conference.example.com";
		emit({
			type: "room-invite-request",
			request: {
				roomJid,
				roomName: "Decline",
				from: "alice@example.com",
				receivedAt: 1234,
			},
		});

		await store.declineRoomInvite(roomJid);
		expect(adapter.declineRoomInvite).toHaveBeenCalledWith(
			roomJid,
			"alice@example.com",
			undefined,
		);
		expect(store.getState().roomInviteRequests).toHaveLength(0);
	});
});
