import type * as StanzaProtocol from "stanza/protocol";
import { bareJid } from "#/lib/xmpp/jid";
import { normalizeMessage } from "#/lib/xmpp/messages";
import { OFFLINE_PRESENCE } from "#/lib/xmpp/presence";
import type { ChatMessage, Contact } from "#/types/chat";

export function normalizeStanzaMessage(
	message: StanzaProtocol.Message,
	accountBareJid: string,
	options: { isCarbon?: boolean; direction?: "incoming" | "outgoing" } = {},
): ChatMessage | null {
	return normalizeMessage(
		{
			id: message.id,
			from: message.from ?? "",
			to: message.to ?? "",
			body: message.body,
			delay: message.delay,
			links: message.links,
		},
		{
			accountBareJid,
			direction: options.direction,
			isCarbon: options.isCarbon,
			now: Date.now(),
		},
	);
}

export function mapHistory(
	fin: StanzaProtocol.MAMFin,
	accountBareJid: string,
): ChatMessage[] {
	const messages: ChatMessage[] = [];
	for (const result of fin.results ?? []) {
		const message = result.item.message;
		if (!message || message.type === "groupchat") continue;
		const delay = result.item.delay?.timestamp ?? message.delay?.timestamp;
		const normalized = normalizeStanzaMessage(
			delay ? { ...message, delay: { timestamp: delay } } : message,
			accountBareJid,
		);
		if (normalized) messages.push(normalized);
	}
	return messages.sort((a, b) => a.timestamp - b.timestamp);
}

export function withFallbackAddress(
	message: StanzaProtocol.Message,
	from: string,
	to: string,
): StanzaProtocol.Message {
	return {
		...message,
		from: message.from ?? from,
		to: message.to ?? to,
	};
}

export function mapRoster(items: StanzaProtocol.RosterItem[]): Contact[] {
	return items.map((item) => ({
		jid: bareJid(item.jid),
		name: item.name,
		subscription: mapSubscription(item.subscription),
		presence: OFFLINE_PRESENCE,
	}));
}

function mapSubscription(
	value: StanzaProtocol.RosterItem["subscription"],
): Contact["subscription"] {
	switch (value) {
		case "both":
		case "to":
		case "from":
			return value;
		default:
			return "none";
	}
}
