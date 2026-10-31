import { createMessageReceiptStore } from "#/lib/storage/message-receipts";
import { uploadAttachmentWithErrors } from "#/lib/xmpp/attachment-actions";
import { createConversationActions } from "#/lib/xmpp/conversation-actions";
import {
	createXmppError,
	isXmppError,
	normalizeXmppError,
} from "#/lib/xmpp/errors";
import { createGroupActions } from "#/lib/xmpp/group-actions";
import {
	loadInviteRequests,
	persistInviteState,
	restoreRoomInvites,
} from "#/lib/xmpp/invite-persistence";
import { bareJid, isValidAccountJid, toAccount } from "#/lib/xmpp/jid";
import { createOmemoStoreBridge } from "#/lib/xmpp/omemo-store";
import { createOutgoingActions } from "#/lib/xmpp/outgoing-actions";
import { OFFLINE_PRESENCE } from "#/lib/xmpp/presence";
import { applyReceiptContext } from "#/lib/xmpp/receipt-events";
import { createInitialState, reduceEvent } from "#/lib/xmpp/reducers";
import { createRoomReactionsKeeper } from "#/lib/xmpp/room-reactions-snapshot";
import { restoreSavedSession } from "#/lib/xmpp/session-restore";
import { hasOutgoingSubscription } from "#/lib/xmpp/subscriptions";
import type { ChatMessage } from "#/types/chat";
import type {
	ConnectionState,
	RoomPreviewResult,
	XmppEvent,
	XmppState,
	XmppStore,
	XmppStoreDeps,
} from "#/types/store";
import type { ConnectCredentials, XmppError } from "#/types/xmpp";
export function createXmppStore(deps: XmppStoreDeps): XmppStore {
	let state = createInitialState();
	const listeners = new Set<() => void>();
	const now = deps.now ?? Date.now;
	const reactions = createRoomReactionsKeeper(deps.roomReactionStore);
	const messageReceipts =
		deps.messageReceiptStore ?? createMessageReceiptStore();
	const idFactory =
		deps.idFactory ??
		(() =>
			globalThis.crypto?.randomUUID?.() ??
			`${now()}-${Math.random().toString(36).slice(2)}`);

	const omemo = createOmemoStoreBridge(deps.adapter, handleEvent);
	function getState() {
		return state;
	}
	function addMessage(message: ChatMessage) {
		handleEvent({ type: "message", message });
	}
	async function loadRoomPreview(jid: string): Promise<RoomPreviewResult> {
		const result = await deps.adapter.loadRoomPreview(jid);
		if (result.status === "ok" && result.messages.length > 0) {
			handleEvent({ type: "history", messages: result.messages });
		}
		return result;
	}

	async function refreshRoomMembers(jid: string): Promise<void> {
		const memberJids = await deps.adapter.getRoomMemberJids(jid);
		handleEvent({ type: "room-members", jid, memberJids });
	}
	function subscribe(listener: () => void) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	}
	function setState(next: XmppState) {
		if (next === state) return;
		state = next;
		for (const listener of listeners) listener();
	}

	function handleEvent(event: XmppEvent) {
		// A subscribe from someone we already asked to see means both sides have
		// opted in; accept it without a second confirmation.
		if (
			event.type === "subscription" &&
			event.action === "subscribe" &&
			hasOutgoingSubscription(state, event.jid)
		) {
			// Routed through the store action so the local request row clears too.
			void acceptSubscription(event.jid);
		}
		const nextEvent = applyReceiptContext(
			restoreRoomInvites(deps.roomInviteStore, state, event),
			state.account?.bareJid ?? null,
			messageReceipts,
		);

		const final = reactions.note(
			nextEvent,
			state,
			reduceEvent(state, nextEvent),
		);
		setState(final);
		persistInviteState(
			deps.roomInviteStore,
			deps.roomInviteRequestStore,
			nextEvent,
			final,
		);
	}

	function setConnection(connection: ConnectionState) {
		setState({ ...state, connection });
	}

	function setError(error: XmppError) {
		setConnection({ ...state.connection, error });
	}

	const conversationActions = createConversationActions({
		getState: () => state,
		setState,
		adapter: deps.adapter,
		roomInviteStore: deps.roomInviteStore,
	});
	const outgoing = createOutgoingActions({
		getState,
		handleEvent,
		adapter: deps.adapter,
		now,
		idFactory,
		onError: setError,
		reactionDelayMs: deps.reactionDelayMs,
	});
	const groups = createGroupActions(
		deps.adapter,
		getState,
		handleEvent,
		setError,
	);
	async function connect(credentials: ConnectCredentials) {
		if (!isValidAccountJid(credentials.jid)) {
			setError(createXmppError("invalid-jid"));
			return;
		}

		const account = toAccount(credentials.jid);
		if (!account) {
			setError(createXmppError("invalid-jid"));
			return;
		}

		deps.sessionStore.save({
			jid: account.bareJid,
			websocketUrl: credentials.websocketUrl,
			boshUrl: credentials.boshUrl,
			resource: credentials.resource,
		});
		deps.sessionStore.savePassword(credentials.password);
		const savedRequests = loadInviteRequests(
			deps.roomInviteRequestStore,
			account.bareJid,
		);

		setState({
			...createInitialState(),
			restorePending: false,
			account,
			roomInviteRequests: savedRequests,
			connection: { status: "connecting", error: null, jid: account.bareJid },
		});

		try {
			await deps.adapter.connect({ ...credentials, jid: account.jid });
			setConnection({ status: "connected", error: null, jid: account.bareJid });
			void deps.adapter
				.getRoster()
				.then((contacts) => {
					if (contacts.length > 0) handleEvent({ type: "roster", contacts });
				})
				.catch(() => undefined);
		} catch (error) {
			const xmppError = isXmppError(error)
				? error
				: normalizeXmppError(error, "connection-failed");
			if (xmppError.code === "auth-failed") {
				deps.sessionStore.clearPassword();
			}
			setConnection({
				status: "error",
				error: xmppError,
				jid: account.bareJid,
			});
		}
	}
	async function restoreSession() {
		await restoreSavedSession({
			getState,
			setState,
			sessionStore: deps.sessionStore,
			connect,
		});
	}
	async function disconnect() {
		deps.sessionStore.clearPassword();
		// Reaction snapshots contain room and participant identifiers; they must
		// not outlive the signed-in session in this tab.
		reactions.clear();
		try {
			await deps.adapter.disconnect();
		} catch {
			// A failed disconnect should still leave the local session closed.
		}
		setState({
			...state,
			account: null,
			activeJid: null,
			connection: {
				status: "disconnected",
				error: null,
				jid: state.connection.jid,
			},
		});
	}

	async function addContact(jid: string) {
		const contactJid = bareJid(jid);
		if (contactJid.toLowerCase() === state.account?.bareJid.toLowerCase())
			return;
		handleEvent({
			type: "presence",
			jid: contactJid,
			presence: OFFLINE_PRESENCE,
		});
		try {
			await deps.adapter.addContact(contactJid);
		} catch (error) {
			setError(normalizeXmppError(error, "unknown"));
		}
	}
	async function acceptSubscription(jid: string) {
		const contactJid = bareJid(jid);
		try {
			await deps.adapter.acceptSubscription(contactJid);
			handleEvent({
				type: "subscription",
				jid: contactJid,
				action: "subscribed",
			});
		} catch (error) {
			setError(normalizeXmppError(error, "unknown"));
		}
	}

	function clearError() {
		setConnection({ ...state.connection, error: null });
	}

	return {
		getState,
		subscribe,
		connect,
		restoreSession,
		disconnect,
		...outgoing,
		...groups,
		addMessage,
		loadRoomPreview,
		refreshRoomMembers,
		getOmemoPep: omemo.getOmemoPep,
		subscribeOmemo: omemo.subscribe,
		uploadAttachment: (file, onProgress) =>
			uploadAttachmentWithErrors({
				uploader: deps.uploader,
				file,
				onProgress,
				onError: setError,
			}),
		...conversationActions,
		addContact,
		acceptSubscription,
		clearError,
	};
}
