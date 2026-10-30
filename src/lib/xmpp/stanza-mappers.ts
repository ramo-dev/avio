import type * as StanzaProtocol from "stanza/protocol";
import { bareJid, jidResource } from "#/lib/xmpp/jid";
import { normalizeMessage } from "#/lib/xmpp/messages";
import { OFFLINE_PRESENCE } from "#/lib/xmpp/presence";
import type { ChatMessage, Contact } from "#/types/chat";
import type { XmppEvent } from "#/types/store";

export function normalizeStanzaMessage(
	message: StanzaProtocol.Message,
	accountBareJid: string,
	options: { isCarbon?: boolean; direction?: "incoming" | "outgoing" } = {},
): ChatMessage | null {
	const forwarded = message.forward?.message;
	return normalizeMessage(
		{
			id: forwarded?.id ?? message.id,
			from: message.from ?? "",
			to: message.to ?? "",
			body: message.body?.trim() ? message.body : forwarded?.body,
			delay: message.delay ?? forwarded?.delay,
			links:
				message.links && message.links.length > 0
					? message.links
					: forwarded?.links,
			reply: message.reply ?? forwarded?.reply,
			forwarded: Boolean(forwarded),
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
		if (message.reactions || message.replace) continue;
		const delay = result.item.delay?.timestamp ?? message.delay?.timestamp;
		const normalized = normalizeStanzaMessage(
			delay ? { ...message, delay: { timestamp: delay } } : message,
			accountBareJid,
		);
		if (normalized) messages.push(normalized);
	}
	return messages.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Maps room MAM results into read-only room messages for invite previews.
 */
export function mapRoomHistory(
	fin: StanzaProtocol.MAMFin,
	accountBareJid: string,
): ChatMessage[] {
	const messages: ChatMessage[] = [];
	for (const result of fin.results ?? []) {
		const message = result.item.message;
		if (!message || message.type !== "groupchat") continue;
		if (message.reactions || message.replace) continue;
		const delay = result.item.delay?.timestamp ?? message.delay?.timestamp;
		const normalized = normalizeGroupMessage(
			delay ? { ...message, delay: { timestamp: delay } } : message,
			accountBareJid,
		);
		if (normalized) messages.push(normalized);
	}
	return messages.sort((a, b) => a.timestamp - b.timestamp);
}

export function mapHistoryActions(
	fin: StanzaProtocol.MAMFin,
	accountBareJid: string,
): XmppEvent[] {
	const events: XmppEvent[] = [];
	const account = accountBareJid.toLowerCase();

	for (const result of fin.results ?? []) {
		const message = result.item.message;
		if (!message) continue;
		const from = message.from ?? "";
		const outgoing = bareJid(from).toLowerCase() === account;
		const jid = outgoing ? bareJid(message.to ?? "") : bareJid(from);
		if (!jid) continue;

		if (message.reactions?.id) {
			events.push({
				type: "reactions",
				jid,
				messageId: message.reactions.id,
				senderJid: outgoing ? accountBareJid : bareJid(from),
				reactions: message.reactions.reactions ?? [],
			});
			continue;
		}

		if (message.replace) {
			const body = message.body?.trim();
			if (body) {
				events.push({
					type: "edit",
					jid,
					messageId: message.replace,
					body,
				});
			}
		}
	}

	return events;
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

export function normalizeGroupMessage(
	message: StanzaProtocol.Message,
	accountBareJid: string,
	ownNick?: string,
): ChatMessage | null {
	const roomJid = bareJid(message.from ?? "");
	const nick = jidResource(message.from ?? "");
	if (!roomJid || !nick) return null;

	const normalized = normalizeMessage(
		{
			id: message.id,
			from: roomJid,
			to: accountBareJid,
			body: message.body,
			delay: message.delay,
			links: message.links,
			reply: message.reply,
		},
		{
			accountBareJid,
			direction: ownNick === nick ? "outgoing" : "incoming",
			now: Date.now(),
		},
	);
	if (!normalized) return null;

	return {
		...normalized,
		conversationJid: roomJid,
		from: message.from ?? roomJid,
		to: roomJid,
		senderNick: nick,
	};
}

export function mapRoster(items: StanzaProtocol.RosterItem[]): Contact[] {
	return items.map((item) => ({
		jid: bareJid(item.jid),
		name: item.name,
		subscription: mapSubscription(item.subscription),
		groups: normalizeGroups(item.groups),
		presence: OFFLINE_PRESENCE,
	}));
}

function normalizeGroups(groups?: string[]): string[] {
	if (!Array.isArray(groups)) return [];
	return Array.from(
		new Set(groups.map((group) => group.trim()).filter(Boolean)),
	);
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
