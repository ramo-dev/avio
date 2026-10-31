import { describe, expect, it } from "vitest";
import { createIncomingEncryptedMessage } from "#/lib/omemo/incoming";
import type { OmemoEncryptedMessage } from "#/types/omemo";
import type { XmppEvent } from "#/types/store";

const envelope: OmemoEncryptedMessage = {
	sid: 7,
	iv: "iv",
	keys: [],
	payload: "payload",
};

function event(
	direction: "incoming" | "outgoing",
	overrides: Partial<Extract<XmppEvent, { type: "omemo-message" }>> = {},
): Extract<XmppEvent, { type: "omemo-message" }> {
	return {
		type: "omemo-message",
		jid: "bob@example.com",
		from: "bob@example.com/phone",
		id: "stanza-1",
		direction,
		envelope,
		...overrides,
	};
}

describe("createIncomingEncryptedMessage", () => {
	it("builds a locked incoming placeholder and keeps the envelope", () => {
		const message = createIncomingEncryptedMessage(
			event("incoming"),
			"alice@example.com",
			1_000,
		);
		expect(message).toMatchObject({
			id: "omemo-stanza-1",
			stanzaId: "stanza-1",
			conversationJid: "bob@example.com",
			direction: "incoming",
			status: "delivered",
			encrypted: true,
			body: "Encrypted message",
			omemoEnvelope: envelope,
		});
	});

	it("builds an outgoing carbon placeholder for the recipient conversation", () => {
		const message = createIncomingEncryptedMessage(
			event("outgoing", { from: "alice@example.com/laptop" }),
			"alice@example.com",
			2_000,
		);
		expect(message).toMatchObject({
			conversationJid: "bob@example.com",
			to: "bob@example.com",
			direction: "outgoing",
			status: "sent",
			omemoEnvelope: envelope,
		});
	});
});
