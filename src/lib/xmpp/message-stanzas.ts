import type { Agent } from "stanza";
import type * as StanzaProtocol from "stanza/protocol";
import { bareJid } from "#/lib/xmpp/jid";
import type { ChatMessage } from "#/types/chat";

export function sendReactionStanza(
	agent: Agent,
	to: string,
	messageId: string,
	reactions: string[],
): void {
	agent.sendMessage({
		to: bareJid(to),
		type: "chat",
		reactions: { id: messageId, reactions },
	});
}

export function sendForwardedStanza(
	agent: Agent,
	to: string,
	source: ChatMessage,
): void {
	const links = source.attachments?.map((attachment) => ({
		url: attachment.url,
		description: attachment.name,
	}));
	const forwarded: StanzaProtocol.Message = {
		id: source.stanzaId ?? source.id,
		from: source.from,
		to: source.to,
		type: "chat",
		body: source.body,
		links,
	};
	agent.sendMessage({
		to: bareJid(to),
		type: "chat",
		body: source.body,
		links,
		forward: { message: forwarded },
	});
}
