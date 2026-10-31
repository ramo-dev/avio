import { applyMessageEdit, applyMessageReaction } from "#/lib/xmpp/messages";
import type { XmppEvent, XmppState } from "#/types/store";

export function reduceReaction(
	state: XmppState,
	event: Extract<XmppEvent, { type: "reactions" }>,
): XmppState {
	const conversation = state.conversations[event.jid];
	if (!conversation) return state;
	// Group reactions arrive from `room@conference/nick`; attribute them to the
	// occupant's real JID so every client sees the same reaction map.
	const room = state.rooms[event.jid];
	const senderJid =
		event.senderNick && room
			? (room.occupants[event.senderNick]?.jid ??
				`${event.jid}/${event.senderNick}`)
			: event.senderJid;
	const messages = applyMessageReaction(
		conversation.messages,
		event.messageId,
		senderJid,
		event.reactions,
	);
	if (messages === conversation.messages) return state;
	return {
		...state,
		conversations: {
			...state.conversations,
			[event.jid]: { ...conversation, messages },
		},
	};
}

export function reduceEdit(
	state: XmppState,
	event: Extract<XmppEvent, { type: "edit" }>,
): XmppState {
	const conversation = state.conversations[event.jid];
	if (!conversation) return state;
	const messages = applyMessageEdit(
		conversation.messages,
		event.messageId,
		event.body,
	);
	if (messages === conversation.messages) return state;
	return {
		...state,
		conversations: {
			...state.conversations,
			[event.jid]: { ...conversation, messages },
		},
	};
}
