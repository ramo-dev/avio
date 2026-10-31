import { describe, expect, it, vi } from "vitest";
import { createStoreHarness } from "#/lib/xmpp/store-test-harness";
import type { ChatMessage } from "#/types/chat";
import type { OmemoEncryptedMessage } from "#/types/omemo";
import type { XmppEvent } from "#/types/store";

const credentials = { jid: "alice@example.com", password: "secret" };
const envelope: OmemoEncryptedMessage = {
	sid: 1001,
	iv: "aXY=",
	keys: [],
	payload: "cGF5bG9hZA==",
};

type OmemoMessageEvent = Extract<XmppEvent, { type: "omemo-message" }>;

describe("xmpp store OMEMO wiring", () => {
	it("creates an optimistic encrypted message and sends only the envelope", async () => {
		const { store, adapter } = createStoreHarness();
		await store.connect(credentials);

		const message = await store.sendEncryptedMessage(
			"bob@example.com",
			"Hi",
			envelope,
		);

		expect(message).toMatchObject({
			id: "local-fixed",
			conversationJid: "bob@example.com",
			body: "Hi",
			encrypted: true,
			status: "pending",
		});
		expect(adapter.sendEncryptedMessage).toHaveBeenCalledWith(
			"bob@example.com",
			"local-fixed",
			envelope,
		);
		expect(adapter.sendMessage).not.toHaveBeenCalled();
		expect(
			store.getState().conversations["bob@example.com"]?.messages[0]?.encrypted,
		).toBe(true);
	});

	it("marks a failed encrypted send without falling back to plaintext", async () => {
		const { store, adapter } = createStoreHarness();
		await store.connect(credentials);
		vi.mocked(adapter.sendEncryptedMessage).mockRejectedValueOnce(
			new Error("transport down"),
		);

		const message = await store.sendEncryptedMessage(
			"bob@example.com",
			"Hi",
			envelope,
		);

		expect(message?.status).toBe("failed");
		expect(adapter.sendMessage).not.toHaveBeenCalled();
		expect(
			store.getState().conversations["bob@example.com"]?.messages[0]?.status,
		).toBe("failed");

		await store.retryMessage(message?.id ?? "");
		expect(adapter.sendMessage).not.toHaveBeenCalled();
		expect(adapter.sendEncryptedMessage).toHaveBeenCalledTimes(1);
	});

	it("refuses encrypted sends while disconnected", async () => {
		const { store, adapter } = createStoreHarness();

		const message = await store.sendEncryptedMessage(
			"bob@example.com",
			"Hi",
			envelope,
		);

		expect(message).toBeNull();
		expect(adapter.sendEncryptedMessage).not.toHaveBeenCalled();
		expect(store.getState().connection.error?.code).toBe("not-connected");
	});

	it("does not forward encrypted messages as plaintext", async () => {
		const { store, adapter } = createStoreHarness();
		await store.connect(credentials);
		const sent = await store.sendEncryptedMessage(
			"bob@example.com",
			"Hi",
			envelope,
		);
		if (!sent) throw new Error("Expected an encrypted message");

		const forwarded = await store.forwardMessage("carol@example.com", sent);

		expect(forwarded).toBeNull();
		expect(adapter.forwardMessage).not.toHaveBeenCalled();
	});

	it("adds decrypted and placeholder messages through addMessage", async () => {
		const { store } = createStoreHarness();
		await store.connect(credentials);
		const placeholder: ChatMessage = {
			id: "omemo-1",
			stanzaId: "1",
			conversationJid: "bob@example.com",
			from: "bob@example.com/phone",
			to: "alice@example.com/web",
			body: "Encrypted message",
			timestamp: 11_000,
			direction: "incoming",
			status: "delivered",
			encrypted: true,
			decryptionError: "Unlock OMEMO to read this message.",
		};

		store.addMessage(placeholder);

		const conversation = store.getState().conversations["bob@example.com"];
		expect(conversation?.messages[0]).toMatchObject({
			body: "Encrypted message",
			encrypted: true,
			decryptionError: "Unlock OMEMO to read this message.",
		});
		expect(conversation?.unread).toBe(1);
	});

	it("marks an explicit unencrypted fallback message", async () => {
		const { store, adapter } = createStoreHarness();
		await store.connect(credentials);

		const message = await store.sendMessage(
			"bob@example.com",
			"fallback",
			undefined,
			{ unencryptedFallback: true },
		);

		expect(message?.unencryptedFallback).toBe(true);
		expect(adapter.sendMessage).toHaveBeenCalled();
		expect(adapter.sendEncryptedMessage).not.toHaveBeenCalled();
	});

	it("forwards OMEMO events to subscribers and skips the reducer", async () => {
		const { store, emit } = createStoreHarness();
		await store.connect(credentials);
		const events: OmemoMessageEvent[] = [];
		const unsubscribe = store.subscribeOmemo((event) => events.push(event));
		const omemoEvent: OmemoMessageEvent = {
			type: "omemo-message",
			jid: "bob@example.com",
			from: "bob@example.com/phone",
			id: "m-1",
			direction: "incoming",
			envelope,
		};

		emit(omemoEvent);

		expect(events).toEqual([omemoEvent]);
		expect(store.getState().conversations["bob@example.com"]).toBeUndefined();

		unsubscribe();
		emit({ ...omemoEvent, id: "m-2" });
		expect(events).toHaveLength(1);
	});
});
