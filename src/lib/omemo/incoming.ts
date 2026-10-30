import type { ChatMessage } from "#/types/chat";
import type { XmppEvent } from "#/types/store";

type OmemoMessageEvent = Extract<XmppEvent, { type: "omemo-message" }>;

/**
 * Builds the timeline entry for an incoming OMEMO envelope before decryption.
 *
 * The placeholder body never contains ciphertext or key material, so a locked
 * or failed session still shows a truthful, safe row.
 */
export function createIncomingEncryptedMessage(
	event: OmemoMessageEvent,
	accountJid: string,
	now = Date.now(),
): ChatMessage {
	const id = event.id
		? `omemo-${event.id}`
		: `omemo-${event.from}-${event.envelope.sid}-${now}`;
	return {
		id,
		stanzaId: event.id,
		conversationJid: event.jid,
		from: event.from,
		to: accountJid,
		body: "Encrypted message",
		timestamp: now,
		direction: "incoming",
		status: "delivered",
		encrypted: true,
	};
}
