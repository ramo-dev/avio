// Live check for group reaction durability against Prosody.
//
// Prosody's MUC history and muc MAM do not replay body-less reaction stanzas,
// so the client restores them from a tab-scoped snapshot when a room replays
// after reconnect. This test pins both behaviors:
// 1. Live: a reaction by one member arrives for the other, attributed to the
//    sender's real JID (rooms must be non-anonymous).
// 2. Reconnect: the reaction is restored after the room history replay.
import { describe, expect, it } from "vitest";
import { createMemoryRoomInviteRequestStore } from "#/lib/storage/room-invite-requests";
import { createMemoryRoomInviteStore } from "#/lib/storage/room-invites";
import { createMemoryRoomReactionStore } from "#/lib/storage/room-reactions";
import { createMemorySessionStore } from "#/lib/storage/session";
import { createStanzaAdapter } from "#/lib/xmpp/client";
import { createXmppStore } from "#/lib/xmpp/store";

const enabled = process.env.XMPP_INTEGRATION === "1";
const websocketUrl =
	process.env.XMPP_WEBSOCKET_URL ?? "ws://localhost:5280/xmpp-websocket";

describe.skipIf(!enabled)("group reactions survive a reconnect", () => {
	it("restores reactions after reconnecting to the room", async () => {
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
				`Reactions probe ${Date.now()}`,
				["lisa@localhost"],
			);
			await bob.acceptRoomInvite(room.jid);
			await waitFor(
				() =>
					bob.getState().rooms[room.jid] &&
					Object.keys(bob.getState().rooms[room.jid].occupants).length > 0,
				10_000,
			);
			await alice.sendMessage(room.jid, "_probe message");
			const target = await waitFor(
				() => bob.getState().conversations[room.jid]?.messages[0],
				10_000,
			);
			if (!target?.stanzaId) throw new Error("No stanza id found for reaction");

			await alice.toggleReaction(room.jid, target.stanzaId, "👍");
			await waitFor(
				() =>
					bob.getState().conversations[room.jid]?.messages[0]?.reactions?.[
						"mary@localhost"
					],
				10_000,
			);
			expect(
				bob.getState().conversations[room.jid].messages[0].reactions,
			).toEqual({ "mary@localhost": ["👍"] });

			await bob.disconnect();
			await bob.connect({
				jid: "lisa@localhost",
				password: "bob123",
				websocketUrl,
			});
			await bob.acceptRoomInvite(room.jid);
			await waitFor(
				() =>
					bob.getState().conversations[room.jid]?.messages[0]?.reactions?.[
						"mary@localhost"
					],
				15_000,
			);
			expect(
				bob.getState().conversations[room.jid].messages[0].reactions,
			).toEqual({ "mary@localhost": ["👍"] });
		} finally {
			await Promise.allSettled([alice.disconnect(), bob.disconnect()]);
		}
	}, 45_000);
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
		roomReactionStore: createMemoryRoomReactionStore(),
		sessionStore: createMemorySessionStore(),
		roomInviteStore: createMemoryRoomInviteStore(),
		roomInviteRequestStore: createMemoryRoomInviteRequestStore(),
	} as unknown as Parameters<typeof createXmppStore>[0]);
}

async function waitFor<T>(
	check: () => T | undefined,
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
