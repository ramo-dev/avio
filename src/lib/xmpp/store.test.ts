import { describe, expect, it, vi } from "vitest";
import { createMemorySessionStore } from "#/lib/storage/session";
import { createXmppStore } from "#/lib/xmpp/store";
import type { ChatMessage } from "#/types/chat";
import type { SendMessageInput, XmppAdapter, XmppEvent } from "#/types/store";

function createHarness() {
	let listener: ((event: XmppEvent) => void) | null = null;
	const sent: SendMessageInput[] = [];
	const sessionStore = createMemorySessionStore();

	const adapter: XmppAdapter = {
		connect: vi.fn(async () => undefined),
		disconnect: vi.fn(async () => undefined),
		sendMessage: vi.fn(async (input: SendMessageInput) => {
			sent.push(input);
		}),
		sendChatState: vi.fn(async () => undefined),
		getRoster: vi.fn(async () => [
			{
				jid: "bob@example.com",
				name: "Bob",
				subscription: "both" as const,
				presence: { show: "offline" as const, priority: 0 },
			},
		]),
		getUploadService: vi.fn(async () => ({
			jid: "upload.example.com",
			maxSize: 10 * 1024 * 1024,
		})),
		getUploadSlot: vi.fn(async () => ({
			download: "https://cdn.example.com/file.png",
			upload: { url: "https://upload.example.com/file.png" },
		})),
		addContact: vi.fn(async () => undefined),
		acceptSubscription: vi.fn(async () => undefined),
		subscribe: (next) => {
			listener = next;
			return () => {
				listener = null;
			};
		},
	};

	const store = createXmppStore({
		adapter,
		uploader: {
			upload: vi.fn(async (file: File) => ({
				id: "attachment-1",
				url: "https://cdn.example.com/file.png",
				name: file.name,
				kind: "image" as const,
				mimeType: file.type,
				size: file.size,
			})),
		},
		sessionStore,
		now: () => 10_000,
		idFactory: () => "fixed",
	});

	return {
		store,
		adapter,
		sessionStore,
		sent,
		emit: (event: XmppEvent) => listener?.(event),
	};
}

const credentials = {
	jid: "alice@example.com",
	password: "secret",
};

describe("xmpp store", () => {
	it("rejects invalid JIDs", async () => {
		const { store } = createHarness();
		await store.connect({ jid: "not-a-jid", password: "x" });
		expect(store.getState().connection.error?.code).toBe("invalid-jid");
	});

	it("refuses to send before connecting", async () => {
		const { store } = createHarness();
		const result = await store.sendMessage("bob@example.com", "Hi");
		expect(result).toBeNull();
		expect(store.getState().connection.error?.code).toBe("not-connected");
	});

	it("connects, loads the roster, and persists the session", async () => {
		const { store, sessionStore } = createHarness();
		await store.connect(credentials);
		await new Promise((resolve) => setTimeout(resolve, 0));

		const state = store.getState();
		expect(state.connection.status).toBe("connected");
		expect(state.account?.bareJid).toBe("alice@example.com");
		expect(state.contacts["bob@example.com"]?.name).toBe("Bob");
		expect(sessionStore.load()?.jid).toBe("alice@example.com");
	});

	it("sends optimistically and updates receipts", async () => {
		const { store, sent, emit } = createHarness();
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

	it("sends attachment-only messages and uploads files", async () => {
		const { store, sent } = createHarness();
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
		const { store, emit } = createHarness();
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
		const { store, emit } = createHarness();
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
