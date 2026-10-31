import { beforeEach, describe, expect, it } from "vitest";
import { createRoomInviteRequestStore } from "#/lib/storage/room-invite-requests";

const ACCOUNT = "alice@example.com";
const request = {
	roomJid: "team@conference.example.com",
	roomName: "Team",
	from: "bob@example.com",
	reason: "Join us",
	receivedAt: 1000,
};

describe("room invite request storage", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("persists pending invite requests across store instances", () => {
		createRoomInviteRequestStore().save(ACCOUNT, [request]);

		expect(createRoomInviteRequestStore().load(ACCOUNT)).toEqual([request]);
	});

	it("keeps accounts isolated", () => {
		const store = createRoomInviteRequestStore();
		store.save(ACCOUNT, [request]);

		expect(store.load("bob@example.com")).toEqual([]);
	});
});
