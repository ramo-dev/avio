import {
	deleteConversationState,
	deleteMessageState,
	ensureConversationState,
	markAllReadState,
	markConversationUnreadState,
} from "#/lib/xmpp/conversation-state";
import { persistRoomInvites } from "#/lib/xmpp/invite-persistence";
import { bareJid } from "#/lib/xmpp/jid";
import { reduceActive } from "#/lib/xmpp/reducers";
import type { RoomInviteStore, XmppAdapter, XmppState } from "#/types/store";

interface ConversationActionDeps {
	getState: () => XmppState;
	setState: (state: XmppState) => void;
	adapter: XmppAdapter;
	roomInviteStore: RoomInviteStore;
}

/** Conversation lifecycle actions: selection, read state, and local removal. */
export function createConversationActions(deps: ConversationActionDeps) {
	const displayedMarkers = new Set<string>();

	function setActiveConversation(jid: string | null) {
		deps.setState(reduceActive(deps.getState(), jid));
	}

	function ensureConversation(jid: string) {
		deps.setState(ensureConversationState(deps.getState(), jid));
	}

	function markConversationUnread(jid: string) {
		deps.setState(markConversationUnreadState(deps.getState(), jid));
	}

	/**
	 * Marks a conversation read and tells the sender their latest message was
	 * displayed (XEP-0333). The marker is sent once per stanza.
	 */
	function markConversationRead(
		jid: string,
		options?: { sendReceipt?: boolean },
	) {
		deps.setState(reduceActive(deps.getState(), jid));
		if (options?.sendReceipt === false) return;
		const conversation = deps.getState().conversations[jid];
		if (!conversation || conversation.kind === "group") return;
		const latest = [...conversation.messages]
			.reverse()
			.find((message) => message.direction === "incoming" && message.stanzaId);
		if (!latest?.stanzaId) return;
		const key = `${jid}|${latest.stanzaId}`;
		if (displayedMarkers.has(key)) return;
		displayedMarkers.add(key);
		void deps.adapter
			.sendDisplayedMarker(jid, latest.stanzaId)
			.catch(() => displayedMarkers.delete(key));
	}

	function markAllRead() {
		deps.setState(markAllReadState(deps.getState()));
	}

	function deleteConversation(jid: string) {
		const state = deps.getState();
		const key = bareJid(jid);
		if (state.conversations[key]?.kind === "group") {
			void deps.adapter.leaveRoom(key).catch(() => undefined);
		}
		const next = deleteConversationState(state, jid);
		deps.setState(next);
		persistRoomInvites(deps.roomInviteStore, next);
	}

	function deleteMessage(jid: string, messageId: string) {
		deps.setState(deleteMessageState(deps.getState(), jid, messageId));
	}

	return {
		setActiveConversation,
		ensureConversation,
		markConversationUnread,
		markConversationRead,
		markAllRead,
		deleteConversation,
		deleteMessage,
	};
}
