import { bareJid } from "#/lib/xmpp/jid";
import { appendMessage } from "#/lib/xmpp/messages";
import { OFFLINE_PRESENCE } from "#/lib/xmpp/presence";
import type { ChatMessage, Contact, Conversation } from "#/types/chat";
import type { XmppState } from "#/types/store";

export function createConversation(jid: string): Conversation {
	return {
		jid,
		messages: [],
		unread: 0,
		lastActivity: 0,
		typing: false,
		historyLoading: false,
		historyComplete: false,
	};
}

export function ensureContact(
	contacts: Record<string, Contact>,
	jid: string,
	name?: string,
): Record<string, Contact> {
	const key = jid.includes("/") ? jid.split("/")[0] : jid;
	const existing = contacts[key];
	if (existing) {
		if (!name || existing.name) return contacts;
		return { ...contacts, [key]: { ...existing, name } };
	}

	return {
		...contacts,
		[key]: {
			jid: key,
			name,
			subscription: "none",
			presence: OFFLINE_PRESENCE,
		},
	};
}

export function ensureConversationState(
	state: XmppState,
	jid: string,
): XmppState {
	const key = bareJid(jid);
	if (state.conversations[key]) return state;

	return {
		...state,
		contacts: ensureContact(state.contacts, key),
		conversations: {
			...state.conversations,
			[key]: createConversation(key),
		},
	};
}

export function markConversationUnreadState(
	state: XmppState,
	jid: string,
): XmppState {
	const key = bareJid(jid);
	const conversation = state.conversations[key];
	if (!conversation) return state;
	return {
		...state,
		conversations: {
			...state.conversations,
			[key]: { ...conversation, unread: Math.max(1, conversation.unread) },
		},
	};
}

export function markAllReadState(state: XmppState): XmppState {
	const conversations = Object.fromEntries(
		Object.entries(state.conversations).map(([jid, conversation]) => [
			jid,
			{ ...conversation, unread: 0 },
		]),
	);
	return { ...state, conversations };
}

export function deleteConversationState(
	state: XmppState,
	jid: string,
): XmppState {
	const key = bareJid(jid);
	if (!state.conversations[key]) return state;

	const conversations = { ...state.conversations };
	const contacts = { ...state.contacts };
	delete conversations[key];
	delete contacts[key];

	return {
		...state,
		conversations,
		contacts,
		activeJid: state.activeJid === key ? null : state.activeJid,
	};
}

export function reduceHistory(
	state: XmppState,
	messages: ChatMessage[],
): XmppState {
	let next = state;

	for (const message of messages) {
		const jid = message.conversationJid;
		const existing = next.conversations[jid] ?? createConversation(jid);
		const merged = appendMessage(existing.messages, message, 1000);
		next = {
			...next,
			contacts: ensureContact(next.contacts, message.from),
			conversations: {
				...next.conversations,
				[jid]: {
					...existing,
					messages: merged,
					lastActivity: Math.max(existing.lastActivity, message.timestamp),
					typing: false,
				},
			},
		};
	}

	return next;
}
