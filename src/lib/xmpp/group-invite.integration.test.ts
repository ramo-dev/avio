import { describe, expect, it } from "vitest";
import { createMemoryRoomInviteRequestStore } from "#/lib/storage/room-invite-requests";
import { createMemoryRoomInviteStore } from "#/lib/storage/room-invites";
import { createMemorySessionStore } from "#/lib/storage/session";
import { createStanzaAdapter } from "#/lib/xmpp/client";
import { createXmppStore } from "#/lib/xmpp/store";

const enabled = process.env.XMPP_INTEGRATION === "1";
const websocketUrl =
	process.env.XMPP_WEBSOCKET_URL ?? "ws://localhost:5280/xmpp-websocket";

describe.skipIf(!enabled)("group invite participant visibility", () => {
	it("shows existing participants to a user after accepting an invite", async () => {
		const alice = createTestStore();
		const bob = createTestStore();

		try {
			await alice.connect({
				jid: "mary@localhost",
				password: "bob123",
				websocketUrl,
			});
			await bob.connect({
				jid: "lisa@localhost",
				password: "bob123",
				websocketUrl,
			});

			const room = await alice.createGroupChat(
				`Invite visibility ${Date.now()}`,
				["lisa@localhost"],
			);
			await waitFor(
				() =>
					bob
						.getState()
						.roomInviteRequests.find((request) => request.roomJid === room.jid),
				10_000,
			);

			await bob.acceptRoomInvite(room.jid);

			const roomState = await waitFor(() => {
				const state = bob.getState().rooms[room.jid];
				return state && Object.keys(state.occupants).length > 0
					? state
					: undefined;
			}, 10_000);
			expect(
				Object.values(roomState.occupants).some(
					(occupant) => occupant.nick === "mary",
				),
			).toBe(true);
			expect(bob.getState().contacts[room.jid]).toBeUndefined();

			const ownerRoom = await waitFor(() => {
				const state = alice.getState().rooms[room.jid];
				return state &&
					Object.values(state.occupants).some(
						(occupant) => occupant.nick === "lisa",
					)
					? state
					: undefined;
			}, 10_000);
			expect(
				Object.values(ownerRoom.occupants).some(
					(occupant) => occupant.nick === "lisa",
				),
			).toBe(true);
			expect(ownerRoom.invites["lisa@localhost"]?.status).toBe("accepted");
			await alice.refreshRoomMembers(room.jid);
			expect(alice.getState().rooms[room.jid]?.memberJids).toContain(
				"lisa@localhost",
			);
		} finally {
			await Promise.allSettled([alice.disconnect(), bob.disconnect()]);
		}
	}, 30_000);
});

function createTestStore() {
	const adapter = createStanzaAdapter();
	return createXmppStore({
		adapter,
		uploader: {
			upload: async (file: File) => ({
				id: "test",
				url: "https://example.com/test",
				name: file.name,
				kind: "file" as const,
				mimeType: file.type,
				size: file.size,
			}),
		},
		sessionStore: createMemorySessionStore(),
		roomInviteStore: createMemoryRoomInviteStore(),
		roomInviteRequestStore: createMemoryRoomInviteRequestStore(),
	});
}

async function waitFor<T>(
	check: () => T | undefined | false,
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
