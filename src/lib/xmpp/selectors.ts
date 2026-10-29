import { displayJidName } from "#/lib/xmpp/jid";
import { OFFLINE_PRESENCE } from "#/lib/xmpp/presence";
import { isSelfJid } from "#/lib/xmpp/reducers";
import type {
	ChatMessage,
	Conversation,
	ConversationSummary,
} from "#/types/chat";
import type { XmppState } from "#/types/store";

export function selectConversationSummaries(
	state: XmppState,
): ConversationSummary[] {
	const summaries: ConversationSummary[] = [];
	const seen = new Set<string>();

	for (const [jid, conversation] of Object.entries(state.conversations)) {
		seen.add(jid);
		summaries.push(toSummary(jid, conversation, state));
	}

	for (const contact of Object.values(state.contacts)) {
		if (seen.has(contact.jid) || isSelfJid(state, contact.jid)) continue;
		summaries.push(toSummary(contact.jid, undefined, state));
	}

	return summaries.sort((a, b) => {
		if (a.lastActivity !== b.lastActivity) {
			return b.lastActivity - a.lastActivity;
		}
		return a.name.localeCompare(b.name);
	});
}

function toSummary(
	jid: string,
	conversation: Conversation | undefined,
	state: XmppState,
): ConversationSummary {
	const contact = state.contacts[jid];
	const room = state.rooms[jid];
	const isGroup =
		conversation?.kind === "group" ||
		Boolean(room) ||
		Boolean(conversation?.messages.some((message) => message.senderNick));
	const occupants = isGroup ? Object.values(room?.occupants ?? {}) : [];

	return {
		jid,
		name: isGroup
			? (conversation?.title ?? room?.name ?? jid)
			: displayJidName(jid, contact?.name),
		kind: isGroup ? "group" : "direct",
		lastMessage: conversation?.messages.at(-1),
		unread: conversation?.unread ?? 0,
		lastActivity: conversation?.lastActivity ?? 0,
		presence: isGroup
			? OFFLINE_PRESENCE
			: (contact?.presence ?? OFFLINE_PRESENCE),
		typing: conversation?.typing ?? false,
		memberCount: isGroup ? occupants.length : undefined,
		participants: isGroup
			? occupants.slice(0, 2).map((occupant) => ({
					jid: occupant.jid,
					name: occupant.nick,
				}))
			: undefined,
	};
}

export function findMessageById(
	state: XmppState,
	messageId: string,
): ChatMessage | undefined {
	for (const conversation of Object.values(state.conversations)) {
		const message = conversation.messages.find((item) => item.id === messageId);
		if (message) return message;
	}
	return undefined;
}
