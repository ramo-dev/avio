import { describe, expect, it } from "vitest";
import { createMemoryMessageReceiptStore } from "#/lib/storage/message-receipts";
import { createMemoryRoomReactionStore } from "#/lib/storage/room-reactions";
import { createStoreHarness } from "#/lib/xmpp/store-test-harness";

const credentials = {
	jid: "alice@example.com/web",
	password: "secret",
};

describe("xmpp read state and subscriptions", () => {
	it("auto-accepts a subscription when we already asked for their presence", async () => {
		const { store, adapter, emit } = createStoreHarness();
		await store.connect(credentials);

		emit({
			type: "roster",
			contacts: [
				{
					jid: "bob@example.com",
					name: "Bob",
					subscription: "to",
					groups: [],
					presence: { show: "available", priority: 0 },
				},
			],
		});
		emit({
			type: "subscription",
			jid: "bob@example.com",
			action: "subscribe",
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(adapter.acceptSubscription).toHaveBeenCalledWith("bob@example.com");
		expect(store.getState().subscriptionRequests).toHaveLength(0);
	});

	it("sends a displayed marker once when a conversation is read", async () => {
		const { store, adapter, emit } = createStoreHarness();
		await store.connect(credentials);

		emit({
			type: "message",
			message: {
				id: "server-1",
				stanzaId: "server-1",
				conversationJid: "bob@example.com",
				from: "bob@example.com/phone",
				to: "alice@example.com",
				body: "hello",
				timestamp: 1_000,
				direction: "incoming",
				status: "delivered",
			},
		});
		store.markConversationRead("bob@example.com");
		expect(adapter.sendDisplayedMarker).toHaveBeenCalledWith(
			"bob@example.com",
			"server-1",
		);

		store.markConversationRead("bob@example.com");
		expect(adapter.sendDisplayedMarker).toHaveBeenCalledTimes(1);
	});

	it("does not send displayed markers for group conversations", async () => {
		const { store, adapter, emit } = createStoreHarness();
		await store.connect(credentials);
		emit({
			type: "room",
			room: {
				jid: "dev@conference.example.com",
				name: "Dev",
				nick: "alice",
				occupants: {},
				invites: {},
			},
		});
		emit({
			type: "message",
			message: {
				id: "group-1",
				stanzaId: "group-1",
				conversationJid: "dev@conference.example.com",
				from: "dev@conference.example.com/bob",
				to: "alice@example.com",
				body: "hi",
				timestamp: 1_000,
				direction: "incoming",
				status: "delivered",
			},
		});

		store.markConversationRead("dev@conference.example.com");
		expect(adapter.sendDisplayedMarker).not.toHaveBeenCalled();
	});

	it("clears room reaction snapshots on logout", async () => {
		const roomReactionStore = createMemoryRoomReactionStore();
		const { store, emit } = createStoreHarness({ roomReactionStore });
		await store.connect(credentials);

		const roomJid = "dev@conference.example.com";
		emit({
			type: "room",
			room: {
				jid: roomJid,
				name: "Dev",
				nick: "alice",
				occupants: {
					mary: {
						nick: "mary",
						jid: "mary@example.com",
						presence: { show: "available", priority: 0 },
					},
				},
				invites: {},
			},
		});
		emit({
			type: "message",
			message: {
				id: "server-1",
				stanzaId: "server-1",
				conversationJid: roomJid,
				from: `${roomJid}/mary`,
				to: "alice@example.com",
				body: "hi",
				timestamp: 1_000,
				direction: "incoming",
				status: "delivered",
			},
		});
		emit({
			type: "reactions",
			jid: roomJid,
			messageId: "server-1",
			senderJid: `${roomJid}/mary`,
			senderNick: "mary",
			reactions: ["👍"],
		});
		expect(roomReactionStore.load()).not.toEqual({});

		await store.disconnect();
		expect(roomReactionStore.load()).toEqual({});
	});

	it("restores read state from receipts after history replay", async () => {
		const messageReceiptStore = createMemoryMessageReceiptStore();
		const { store, emit } = createStoreHarness({ messageReceiptStore });
		await store.connect(credentials);

		emit({
			type: "message-status",
			id: "server-1",
			stanzaId: "server-1",
			status: "read",
		});
		emit({
			type: "history",
			messages: [
				{
					id: "server-1",
					stanzaId: "server-1",
					conversationJid: "bob@example.com",
					from: "alice@example.com",
					to: "bob@example.com",
					body: "hello",
					timestamp: 1_000,
					direction: "outgoing",
					status: "sent",
				},
			],
		});

		expect(
			store.getState().conversations["bob@example.com"]?.messages[0]?.status,
		).toBe("read");
	});

	it("can mark a conversation read without sending a receipt", async () => {
		const { store, adapter, emit } = createStoreHarness();
		await store.connect(credentials);
		emit({
			type: "message",
			message: {
				id: "server-1",
				stanzaId: "server-1",
				conversationJid: "bob@example.com",
				from: "bob@example.com/phone",
				to: "alice@example.com",
				body: "hello",
				timestamp: 1_000,
				direction: "incoming",
				status: "delivered",
			},
		});

		store.markConversationRead("bob@example.com", { sendReceipt: false });
		expect(adapter.sendDisplayedMarker).not.toHaveBeenCalled();
		expect(store.getState().conversations["bob@example.com"]?.unread).toBe(0);
	});
});
