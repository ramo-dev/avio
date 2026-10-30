import type { Agent } from "stanza";
import { OmemoPep } from "#/lib/omemo/pep";
import { createXmppError } from "#/lib/xmpp/errors";
import { toStanzaOmemo } from "#/lib/xmpp/omemo-message";
import { createStanzaOmemoPep } from "#/lib/xmpp/omemo-pep";
import type { OmemoEncryptedMessage, OmemoPepClient } from "#/types/omemo";

/** Connection-scoped OMEMO actions used by the XMPP adapter. */
export function createOmemoActions(
	getClient: () => Agent | null,
	getAccountBareJid: () => string,
) {
	async function getOmemoPep(): Promise<OmemoPepClient> {
		const client = getClient();
		if (!client) throw createXmppError("not-connected");
		return new OmemoPep(createStanzaOmemoPep(client, getAccountBareJid()));
	}

	async function sendEncryptedMessage(
		to: string,
		id: string,
		envelope: OmemoEncryptedMessage,
	): Promise<void> {
		const client = getClient();
		if (!client) throw createXmppError("not-connected");
		client.sendMessage({
			to,
			id,
			type: "chat",
			omemo: toStanzaOmemo(envelope),
			processingHints: { store: true },
		});
	}

	return { getOmemoPep, sendEncryptedMessage };
}
