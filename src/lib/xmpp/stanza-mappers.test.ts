import type * as StanzaProtocol from "stanza/protocol";
import { describe, expect, it } from "vitest";
import { normalizeStanzaMessage } from "#/lib/xmpp/stanza-mappers";

function forwardedMessage(
	overrides: Partial<StanzaProtocol.Message> = {},
): StanzaProtocol.Message {
	return {
		id: "outer-1",
		from: "carol@example.com/phone",
		to: "alice@example.com/web",
		type: "chat",
		body: "",
		forward: {
			message: {
				id: "inner-1",
				from: "bob@example.com/phone",
				to: "carol@example.com",
				type: "chat",
				body: "Original",
			},
		},
		...overrides,
	};
}

describe("stanza mappers", () => {
	it("uses the forwarded message id and body", () => {
		const result = normalizeStanzaMessage(
			forwardedMessage(),
			"alice@example.com",
		);

		expect(result).toMatchObject({
			id: "inner-1",
			stanzaId: "inner-1",
			conversationJid: "carol@example.com",
			body: "Original",
			direction: "incoming",
		});
	});

	it("keeps the forwarded target id when a fallback body is present", () => {
		const result = normalizeStanzaMessage(
			forwardedMessage({ body: "Forwarded" }),
			"alice@example.com",
		);

		expect(result?.id).toBe("inner-1");
		expect(result?.body).toBe("Forwarded");
	});
});
