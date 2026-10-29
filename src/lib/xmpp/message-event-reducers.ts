import { applyMessageEdit, applyMessageReaction } from "#/lib/xmpp/messages";
import type { XmppEvent, XmppState } from "#/types/store";

export function reduceReaction(
	state: XmppState,
	event: Extract<XmppEvent, { type: "reactions" }>,
): XmppState {
	const conversation = state.conversations[event.jid];
	if (!conversation) return state;
	const messages = applyMessageReaction(
		conversation.messages,
		event.messageId,
		event.senderJid,
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
