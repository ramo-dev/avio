import { describe, expect, it } from "vitest";
import {
	appendMessage,
	applyMessageStatus,
	groupMessages,
	normalizeMessage,
} from "#/lib/xmpp/messages";
import type { ChatMessage } from "#/types/chat";

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
	return {
		id: "m1",
		conversationJid: "bob@example.com",
		from: "bob@example.com/phone",
		to: "alice@example.com/web",
		body: "Hello",
		timestamp: 1_000,
		direction: "incoming",
		status: "delivered",
		...overrides,
	};
}

describe("message helpers", () => {
	it("normalizes incoming messages from full JIDs", () => {
		const result = normalizeMessage(
			{
				id: "stanza-1",
				from: "bob@example.com/phone",
				to: "alice@example.com/web",
				body: "  Hello  ",
			},
			{ accountBareJid: "alice@example.com", now: 5000 },
		);

		expect(result).toMatchObject({
			id: "stanza-1",
			stanzaId: "stanza-1",
			conversationJid: "bob@example.com",
			direction: "incoming",
			body: "Hello",
			timestamp: 5000,
		});
	});

	it("normalizes carbon-sent messages as outgoing", () => {
		const result = normalizeMessage(
			{
				id: "stanza-2",
				from: "alice@example.com/phone",
				to: "bob@example.com",
				body: "Hi",
			},
			{
				accountBareJid: "alice@example.com",
				direction: "outgoing",
				isCarbon: true,
			},
		);

		expect(result?.conversationJid).toBe("bob@example.com");
		expect(result?.direction).toBe("outgoing");
		expect(result?.isCarbon).toBe(true);
	});

	it("normalizes OOB link attachments", () => {
		const result = normalizeMessage(
			{
				from: "bob@example.com/phone",
				to: "alice@example.com/web",
				body: "",
				links: [
					{
						url: "https://cdn.example.com/photo.png",
						description: "photo.png",
					},
				],
			},
			{ accountBareJid: "alice@example.com" },
		);

		expect(result?.body).toBe("");
		expect(result?.attachments?.[0]).toMatchObject({
			name: "photo.png",
			url: "https://cdn.example.com/photo.png",
			kind: "image",
		});
	});

	it("drops OOB links that are not http(s)", () => {
		const result = normalizeMessage(
			{
				from: "mallory@example.com/phone",
				to: "alice@example.com/web",
				body: "",
				links: [
					{ url: "javascript:alert(document.cookie)", description: "a" },
					{ url: "data:text/html,<script>x</script>", description: "b" },
					{ url: "blob:https://example.com/abc", description: "c" },
					{ url: "https://cdn.example.com/doc.pdf", description: "doc.pdf" },
				],
			},
			{ accountBareJid: "alice@example.com" },
		);

		expect(result?.attachments?.map((attachment) => attachment.url)).toEqual([
			"https://cdn.example.com/doc.pdf",
		]);
	});

	it("ignores empty bodies", () => {
		expect(
			normalizeMessage(
				{ from: "bob@example.com", to: "alice@example.com", body: "   " },
				{ accountBareJid: "alice@example.com" },
			),
		).toBeNull();
	});

	it("deduplicates and upgrades status", () => {
		const first = appendMessage([], message());
		const duplicate = appendMessage(first, message({ status: "read" }));
		expect(duplicate).toHaveLength(1);
		expect(duplicate[0].status).toBe("read");
	});

	it("applies status by local or stanza id", () => {
		const messages = [
			message({ id: "local-1", stanzaId: "stanza-1", status: "pending" }),
		];
		expect(
			applyMessageStatus(messages, "sent", { id: "local-1" })[0].status,
		).toBe("sent");
		expect(
			applyMessageStatus(messages, "delivered", { stanzaId: "stanza-1" })[0]
				.status,
		).toBe("delivered");
	});

	it("groups consecutive messages within the window", () => {
		const groups = groupMessages([
			message({ id: "1", timestamp: 1_000 }),
			message({ id: "2", timestamp: 2_000, body: "Again" }),
			message({
				id: "3",
				timestamp: 400_000,
				body: "Later",
				from: "bob@example.com/phone",
			}),
		]);
		expect(groups).toHaveLength(2);
		expect(groups[0].messages).toHaveLength(2);
	});
});
