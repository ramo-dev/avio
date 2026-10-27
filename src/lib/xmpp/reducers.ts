import {
	createConversation,
	ensureContact,
	reduceHistory,
} from "#/lib/xmpp/conversation-state";
import { bareJid } from "#/lib/xmpp/jid";
import {
	appendMessage,
	applyMessageStatus,
	hasMessage,
} from "#/lib/xmpp/messages";
import { OFFLINE_PRESENCE, pickBestPresence } from "#/lib/xmpp/presence";
import type { ChatMessage, Contact, Conversation } from "#/types/chat";
import type { XmppEvent, XmppState } from "#/types/store";
import type { PresenceState, SubscriptionRequest } from "#/types/xmpp";

const MAX_MESSAGES = 1000;

export function createInitialState(): XmppState {
	return {
		connection: { status: "idle", error: null, jid: null },
		restorePending: true,
		account: null,
		contacts: {},
		presences: {},
		conversations: {},
		activeJid: null,
		subscriptionRequests: [],
	};
}

export function reduceEvent(state: XmppState, event: XmppEvent): XmppState {
	switch (event.type) {
		case "connection":
			return reduceConnection(state, event);
		case "roster":
			return reduceRoster(state, event.contacts);
		case "presence":
			return reducePresence(state, event.jid, event.presence);
		case "message":
			return reduceMessage(state, event.message);
		case "history":
			return reduceHistory(state, event.messages);
		case "message-status":
			return reduceMessageStatus(state, event);
		case "typing":
			return reduceTyping(state, event.jid, event.typing);
		case "subscription":
			return reduceSubscription(state, event.jid, event.action);
		default:
			return state;
	}
}

export function reduceActive(state: XmppState, jid: string | null): XmppState {
	const conversations = { ...state.conversations };
	if (jid && conversations[jid]) {
		conversations[jid] = { ...conversations[jid], unread: 0 };
	}
	return { ...state, activeJid: jid, conversations };
}

export function reduceConnection(
	state: XmppState,
	event: Extract<XmppEvent, { type: "connection" }>,
): XmppState {
	const jid = event.jid ?? state.connection.jid;
	const account =
		event.status === "connected" && state.account
			? { ...state.account, jid: jid ?? state.account.jid }
			: state.account;
	const connectionLost =
		event.status === "disconnected" || event.status === "error";
	const contacts = connectionLost
		? Object.fromEntries(
				Object.entries(state.contacts).map(([key, contact]) => [
					key,
					{ ...contact, presence: OFFLINE_PRESENCE },
				]),
			)
		: state.contacts;

	return {
		...state,
		account,
		contacts,
		presences: connectionLost ? {} : state.presences,
		connection: {
			status: event.status,
			error:
				event.error ??
				(event.status === "connected" ? null : state.connection.error),
			jid,
		},
	};
}

export function reduceRoster(state: XmppState, incoming: Contact[]): XmppState {
	if (incoming.length === 0) return state;
	const contacts = { ...state.contacts };
	for (const contact of incoming) {
		contacts[contact.jid] = {
			...contact,
			presence: contacts[contact.jid]?.presence ?? contact.presence,
		};
	}
	return { ...state, contacts };
}

export function reducePresence(
	state: XmppState,
	jid: string,
	presence: PresenceState,
): XmppState {
	const key = bareJid(jid);
	if (isSelfJid(state, key)) return state;

	const resources = { ...state.presences[key] };
	if (presence.show === "offline") {
		delete resources[jid];
	} else {
		resources[jid] = presence;
	}

	const best = pickBestPresence(Object.values(resources));
	const contactPresence =
		best.show === "offline"
			? {
					...OFFLINE_PRESENCE,
					lastSeen: presence.show === "offline" ? presence.lastSeen : undefined,
				}
			: best;

	const existing = state.contacts[key];
	return {
		...state,
		presences: { ...state.presences, [key]: resources },
		contacts: {
			...state.contacts,
			[key]: {
				jid: key,
				name: existing?.name,
				subscription: existing?.subscription ?? "none",
				presence: contactPresence,
			},
		},
	};
}

export function reduceMessage(
	state: XmppState,
	message: ChatMessage,
): XmppState {
	const jid = message.conversationJid;
	const existing = state.conversations[jid] ?? createConversation(jid);
	const isNew = !hasMessage(existing.messages, message);
	const messages = appendMessage(existing.messages, message, MAX_MESSAGES);
	const isActive = state.activeJid === jid;
	const unread =
		message.direction === "incoming" && !isActive && isNew
			? existing.unread + 1
			: existing.unread;

	const conversation: Conversation = {
		...existing,
		messages,
		unread,
		lastActivity: Math.max(existing.lastActivity, message.timestamp),
		typing: isNew && message.direction === "incoming" ? false : existing.typing,
	};

	return {
		...state,
		contacts: isSelfJid(state, message.from)
			? state.contacts
			: ensureContact(state.contacts, message.from),
		conversations: {
			...state.conversations,
			[jid]: conversation,
		},
	};
}

export function reduceMessageStatus(
	state: XmppState,
	event: Extract<XmppEvent, { type: "message-status" }>,
): XmppState {
	let changed = false;
	const conversations = { ...state.conversations };

	for (const [jid, conversation] of Object.entries(conversations)) {
		const messages = applyMessageStatus(conversation.messages, event.status, {
			id: event.id,
			stanzaId: event.stanzaId,
		});
		if (messages !== conversation.messages) {
			changed = true;
			conversations[jid] = { ...conversation, messages };
		}
	}

	return changed ? { ...state, conversations } : state;
}

export function reduceTyping(
	state: XmppState,
	jid: string,
	typing: boolean,
): XmppState {
	const key = bareJid(jid);
	const conversation = state.conversations[key];
	if (!conversation) return state;
	return {
		...state,
		conversations: {
			...state.conversations,
			[key]: { ...conversation, typing },
		},
	};
}

export function reduceSubscription(
	state: XmppState,
	jid: string,
	action: "subscribe" | "subscribed" | "unsubscribe" | "unsubscribed",
): XmppState {
	const key = bareJid(jid);
	if (isSelfJid(state, key)) return state;
	const requests = state.subscriptionRequests.filter(
		(request: SubscriptionRequest) => request.jid !== key,
	);

	if (action === "subscribe") {
		requests.push({ jid: key });
	}

	return {
		...state,
		contacts: ensureContact(state.contacts, key),
		subscriptionRequests: requests,
	};
}

export function isSelfJid(state: XmppState, jid: string): boolean {
	const own = state.account?.bareJid;
	return Boolean(own && bareJid(jid).toLowerCase() === own.toLowerCase());
}
