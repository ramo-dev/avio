import { describe, expect, it } from "vitest";
import { createStoreHarness } from "#/lib/xmpp/store-test-harness";
import type { ChatMessage } from "#/types/chat";

const credentials = {
	jid: "alice@example.com",
	password: "secret",
};

describe("xmpp store", () => {
	it("rejects invalid JIDs", async () => {
		const { store } = createStoreHarness();
		await store.connect({ jid: "not-a-jid", password: "x" });
		expect(store.getState().connection.error?.code).toBe("invalid-jid");
	});

	it("refuses to send before connecting", async () => {
		const { store } = createStoreHarness();
		const result = await store.sendMessage("bob@example.com", "Hi");
		expect(result).toBeNull();
		expect(store.getState().connection.error?.code).toBe("not-connected");
	});

	it("connects, loads the roster, and persists the session", async () => {
		const { store, sessionStore } = createStoreHarness();
		await store.connect(credentials);
		await new Promise((resolve) => setTimeout(resolve, 0));

		const state = store.getState();
		expect(state.connection.status).toBe("connected");
		expect(state.account?.bareJid).toBe("alice@example.com");
		expect(state.contacts["bob@example.com"]?.name).toBe("Bob");
		expect(sessionStore.load()?.jid).toBe("alice@example.com");
	});

	it("sends optimistically and updates receipts", async () => {
		const { store, sent, emit } = createStoreHarness();
		await store.connect(credentials);
		const message = await store.sendMessage("bob@example.com", "  Hi  ");

		expect(message?.status).toBe("pending");
		expect(sent[0]).toMatchObject({
			to: "bob@example.com",
			body: "Hi",
			id: "local-fixed",
		});
		expect(
			store.getState().conversations["bob@example.com"]?.messages[0].status,
		).toBe("pending");
		expect(store.getState().contacts["alice@example.com"]).toBeUndefined();

		emit({ type: "message-status", id: "local-fixed", status: "sent" });
		emit({ type: "message-status", id: "local-fixed", status: "delivered" });
		expect(
			store.getState().conversations["bob@example.com"]?.messages[0].status,
		).toBe("delivered");
	});

	it("sends replies and edits existing messages", async () => {
		let index = 0;
		const { store, sent } = createStoreHarness({
			idFactory: () => `id-${++index}`,
		});
		await store.connect(credentials);

		const original = await store.sendMessage("bob@example.com", "Original");
		await store.sendMessage("bob@example.com", "Reply", undefined, {
			replyTo: { id: original?.id ?? "", to: "bob@example.com" },
		});

		expect(sent[1]).toMatchObject({
			body: "Reply",
			replyTo: { id: "local-id-1", to: "bob@example.com" },
		});
		let messages =
			store.getState().conversations["bob@example.com"]?.messages ?? [];
		expect(messages[1]?.replyTo?.id).toBe("local-id-1");

		await store.sendMessage("bob@example.com", "Edited", undefined, {
			editId: original?.id ?? "",
		});

		messages =
			store.getState().conversations["bob@example.com"]?.messages ?? [];
		expect(sent[2]).toMatchObject({
			body: "Edited",
			editId: "local-id-1",
		});
		expect(messages).toHaveLength(2);
		const edited = messages.find((message) => message.id === "local-id-1");
		expect(edited?.body).toBe("Edited");
		expect(edited?.edited).toBe(true);
	});

	it("toggles reactions and applies incoming reactions and edits", async () => {
		const { store, adapter, emit } = createStoreHarness();
		await store.connect(credentials);
		await store.sendMessage("bob@example.com", "Hi");

		await store.toggleReaction("bob@example.com", "local-fixed", "👍");
		expect(adapter.sendReaction).toHaveBeenCalledWith(
			"bob@example.com",
			"local-fixed",
			["👍"],
			"chat",
		);
		expect(
			store.getState().conversations["bob@example.com"]?.messages[0]?.reactions,
		).toEqual({ "alice@example.com": ["👍"] });

		await store.toggleReaction("bob@example.com", "local-fixed", "❤️");
		expect(
			store.getState().conversations["bob@example.com"]?.messages[0]?.reactions,
		).toEqual({ "alice@example.com": ["❤️"] });

		await store.toggleReaction("bob@example.com", "local-fixed", "❤️");
		expect(
			store.getState().conversations["bob@example.com"]?.messages[0]?.reactions,
		).toBeUndefined();

		emit({
			type: "reactions",
			jid: "bob@example.com",
			messageId: "local-fixed",
			senderJid: "bob@example.com",
			reactions: ["🎉"],
		});
		expect(
			store.getState().conversations["bob@example.com"]?.messages[0]?.reactions,
		).toEqual({ "bob@example.com": ["🎉"] });

		emit({
			type: "edit",
			jid: "bob@example.com",
			messageId: "local-fixed",
			body: "Updated",
		});
		const message =
			store.getState().conversations["bob@example.com"]?.messages[0];
		expect(message?.body).toBe("Updated");
		expect(message?.edited).toBe(true);
	});

	it("scopes reactions to the conversation containing the message", async () => {
		const { store, adapter, emit } = createStoreHarness();
		await store.connect(credentials);

		const base: ChatMessage = {
			id: "shared-id",
			stanzaId: "shared-id",
			conversationJid: "carol@example.com",
			from: "carol@example.com/phone",
			to: "alice@example.com/web",
			body: "Original",
			timestamp: 10_000,
			direction: "incoming",
			status: "delivered",
		};
		emit({ type: "message", message: base });
		emit({
			type: "message",
			message: {
				...base,
				conversationJid: "bob@example.com",
				from: "bob@example.com/phone",
			},
		});

		await store.toggleReaction("bob@example.com", "shared-id", "👍");

		expect(
			store.getState().conversations["bob@example.com"]?.messages[0]?.reactions,
		).toEqual({ "alice@example.com": ["👍"] });
		expect(
			store.getState().conversations["carol@example.com"]?.messages[0]
				?.reactions,
		).toBeUndefined();
		expect(adapter.sendReaction).toHaveBeenCalledWith(
			"bob@example.com",
			"shared-id",
			["👍"],
			"chat",
		);
	});

	it("deletes a message locally", async () => {
		const { store } = createStoreHarness();
		await store.connect(credentials);
		await store.sendMessage("bob@example.com", "Remove me");

		store.deleteMessage("bob@example.com", "local-fixed");

		const conversation = store.getState().conversations["bob@example.com"];
		expect(conversation?.messages).toHaveLength(0);
		expect(conversation?.lastActivity).toBe(0);
	});

	it("forwards a message to another conversation", async () => {
		const { store, adapter } = createStoreHarness();
		await store.connect(credentials);
		const source: ChatMessage = {
			id: "source-1",
			stanzaId: "source-1",
			conversationJid: "bob@example.com",
			from: "bob@example.com/phone",
			to: "alice@example.com/web",
			body: "Forward this",
			timestamp: 9_000,
			direction: "incoming",
			status: "delivered",
		};

		const forwarded = await store.forwardMessage("carol@example.com", source);

		expect(adapter.forwardMessage).toHaveBeenCalledWith(
			"carol@example.com",
			source,
			"local-fixed",
		);
		expect(forwarded).toMatchObject({
			conversationJid: "carol@example.com",
			body: "Forward this",
			forwarded: true,
			direction: "outgoing",
		});
		expect(
			store.getState().conversations["carol@example.com"]?.messages[0]
				?.forwarded,
		).toBe(true);
	});

	it("sends attachment-only messages and uploads files", async () => {
		const { store, sent } = createStoreHarness();
		await store.connect(credentials);

		const attachment = await store.uploadAttachment(
			new File(["hello"], "note.txt", { type: "text/plain" }),
		);
		const message = await store.sendMessage("bob@example.com", "", [
			attachment,
		]);

		expect(message?.body).toBe("");
		expect(message?.attachments?.[0]?.name).toBe("note.txt");
		expect(sent[0]?.attachments?.[0]?.url).toBe(
			"https://cdn.example.com/file.png",
		);
	});

	it("tracks unread messages until the conversation is opened", async () => {
		const { store, emit } = createStoreHarness();
		await store.connect(credentials);

		const incoming: ChatMessage = {
			id: "m1",
			conversationJid: "bob@example.com",
			from: "bob@example.com/phone",
			to: "alice@example.com/web",
			body: "Hello",
			timestamp: 10_500,
			direction: "incoming",
			status: "delivered",
		};
		emit({ type: "message", message: incoming });

		expect(store.getState().conversations["bob@example.com"]?.unread).toBe(1);
		store.setActiveConversation("bob@example.com");
		expect(store.getState().conversations["bob@example.com"]?.unread).toBe(0);
	});

	it("updates presence and subscription requests", async () => {
		const { store, emit } = createStoreHarness();
		await store.connect(credentials);

		emit({
			type: "presence",
			jid: "bob@example.com/phone",
			presence: { show: "chat", priority: 1 },
		});
		expect(store.getState().contacts["bob@example.com"]?.presence.show).toBe(
			"chat",
		);

		emit({
			type: "subscription",
			jid: "carol@example.com",
			action: "subscribe",
		});
		expect(store.getState().subscriptionRequests).toHaveLength(1);
		await store.acceptSubscription("carol@example.com");
		expect(store.getState().subscriptionRequests).toHaveLength(0);
	});
});
