import { createRoomReactionStore } from "#/lib/storage/room-reactions";
import { applyMessageReaction } from "#/lib/xmpp/messages";
import type { ChatMessage } from "#/types/chat";
import type { RoomReactionStore } from "#/types/storage";
import type { XmppEvent, XmppState } from "#/types/store";

export interface RoomReactionsKeeper {
	/**
	 * Records reaction changes into the snapshot and reconciles replayed room
	 * messages against it. Returns the possibly-updated state to set.
	 */
	note(event: XmppEvent, before: XmppState, after: XmppState): XmppState;
	/** Drops the snapshot; used on logout. */
	clear(): void;
}

function isRoomEvent(next: XmppState, jid: string): boolean {
	return Boolean(next.rooms[jid]);
}

function reactionKeyOf(message: ChatMessage): string {
	return message.stanzaId ?? message.id;
}

function findMessage(
	state: XmppState,
	roomJid: string,
	messageId: string,
): ChatMessage | undefined {
	return state.conversations[roomJid]?.messages.find(
		(message) =>
			message.id === messageId ||
			message.stanzaId === messageId ||
			reactionKeyOf(message) === messageId,
	);
}

/** Sender keys whose reaction list changed between two message states. */
export function changedReactionKeys(
	before: ChatMessage | undefined,
	after: ChatMessage | undefined,
): string[] {
	const changed: string[] = [];
	const afterMap = after?.reactions ?? {};
	for (const [senderJid, reactions] of Object.entries(afterMap)) {
		if (
			JSON.stringify(before?.reactions?.[senderJid]) !==
			JSON.stringify(reactions)
		) {
			changed.push(senderJid);
		}
	}
	const beforeMap = before?.reactions ?? {};
	for (const senderJid of Object.keys(beforeMap)) {
		if (!(senderJid in afterMap)) changed.push(senderJid);
	}
	return changed;
}

/**
 * Keeps a tab-scoped snapshot of room reaction maps so reactions survive a
 * reconnect/replay that the server does not carry (Prosody's MUC
 * history and muc MAM do not replay body-less reaction stanzas).
 */
export function createRoomReactionsKeeper(
	store: RoomReactionStore = createRoomReactionStore(),
): RoomReactionsKeeper {
	return {
		note(event, before, after) {
			recordReaction(event, before, after, store);
			return reconcileMessage(event, after, store);
		},
		clear() {
			store.clear();
		},
	};
}

function recordReaction(
	event: XmppEvent,
	before: XmppState,
	after: XmppState,
	store: RoomReactionStore,
): void {
	if (event.type !== "reactions" || !isRoomEvent(after, event.jid)) return;
	const beforeMessage = findMessage(before, event.jid, event.messageId);
	const afterMessage = findMessage(after, event.jid, event.messageId);
	if (!afterMessage) return;

	const snapshot = store.load();
	const roomEntry = { ...(snapshot[event.jid] ?? {}) };
	const entry = { ...roomEntry[reactionKeyOf(afterMessage)] };
	for (const senderJid of changedReactionKeys(beforeMessage, afterMessage)) {
		entry[senderJid] = afterMessage.reactions?.[senderJid] ?? [];
	}
	if (Object.keys(entry).length === 0) {
		delete roomEntry[reactionKeyOf(afterMessage)];
	} else {
		roomEntry[reactionKeyOf(afterMessage)] = entry;
	}
	store.save({ ...snapshot, [event.jid]: roomEntry });
}

function reconcileMessage(
	event: XmppEvent,
	next: XmppState,
	store: RoomReactionStore,
): XmppState {
	if (
		event.type !== "message" ||
		!isRoomEvent(next, event.message.conversationJid)
	) {
		return next;
	}
	const roomJid = event.message.conversationJid;
	const conversation = next.conversations[roomJid];
	if (!conversation) return next;

	const snapshot = store.load()[roomJid];
	if (!snapshot) return next;

	let messages = conversation.messages;
	let mutated = false;
	for (const message of conversation.messages) {
		const entries = snapshot[reactionKeyOf(message)];
		if (!entries) continue;
		for (const [senderJid, reactions] of Object.entries(entries)) {
			// Only fill gaps: a server- or user-delivered reaction wins.
			if (message.reactions?.[senderJid]) continue;
			messages = applyMessageReaction(
				messages,
				message.id,
				senderJid,
				reactions,
			);
			mutated = true;
		}
	}
	if (!mutated) return next;

	return {
		...next,
		conversations: {
			...next.conversations,
			[roomJid]: { ...conversation, messages },
		},
	};
}
