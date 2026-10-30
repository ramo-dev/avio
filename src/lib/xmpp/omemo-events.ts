import type * as StanzaProtocol from "stanza/protocol";
import { bareJid } from "#/lib/xmpp/jid";
import { fromStanzaOmemo } from "#/lib/xmpp/omemo-message";
import type { OmemoEncryptedMessage } from "#/types/omemo";
import type { XmppEvent } from "#/types/store";

export type OmemoDirection = "incoming" | "outgoing";

/**
 * Creates the stanza-to-domain OMEMO event mapper.
 *
 * A WeakSet prevents Stanza's carbon re-emission from producing duplicate
 * events. Malformed or groupchat OMEMO stanzas are consumed and dropped so no
 * body fallback or unrelated event handler sees them.
 */
export function createOmemoEventEmitter(
	emit: (event: XmppEvent) => void,
	getAccountBareJid: () => string,
) {
	const emitted = new WeakSet<StanzaProtocol.Message>();

	return function emitOmemo(
		message: StanzaProtocol.Message,
		fallbackFrom: string,
		fallbackTo: string,
		direction?: OmemoDirection,
	): boolean {
		if (!message.omemo) return false;
		if (emitted.has(message)) return true;
		emitted.add(message);
		if (message.type === "groupchat") return true;

		const from = message.from ?? fallbackFrom;
		const to = message.to ?? fallbackTo;
		const outgoing =
			direction !== undefined
				? direction === "outgoing"
				: bareJid(from).toLowerCase() === getAccountBareJid().toLowerCase();

		let envelope: OmemoEncryptedMessage;
		try {
			envelope = fromStanzaOmemo(message.omemo);
		} catch {
			return true;
		}

		emit({
			type: "omemo-message",
			jid: outgoing ? bareJid(to) : bareJid(from),
			from,
			id: message.id,
			direction: outgoing ? "outgoing" : "incoming",
			envelope,
		});
		return true;
	};
}
