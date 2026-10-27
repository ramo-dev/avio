import {
	createXmppError,
	isXmppError,
	normalizeXmppError,
} from "#/lib/xmpp/errors";
import { bareJid, isValidAccountJid, toAccount } from "#/lib/xmpp/jid";
import { OFFLINE_PRESENCE } from "#/lib/xmpp/presence";
import {
	createInitialState,
	reduceActive,
	reduceEvent,
} from "#/lib/xmpp/reducers";
import type { ChatMessage } from "#/types/chat";
import type {
	ConnectionState,
	XmppEvent,
	XmppState,
	XmppStore,
	XmppStoreDeps,
} from "#/types/store";
import type { ChatState, ConnectCredentials, XmppError } from "#/types/xmpp";

export function createXmppStore(deps: XmppStoreDeps): XmppStore {
	let state = createInitialState();
	const listeners = new Set<() => void>();
	const now = deps.now ?? Date.now;
	const idFactory =
		deps.idFactory ??
		(() =>
			globalThis.crypto?.randomUUID?.() ??
			`${now()}-${Math.random().toString(36).slice(2)}`);

	deps.adapter.subscribe(handleEvent);

	function getState() {
		return state;
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
		setState(reduceEvent(state, event));
	}

	function setConnection(connection: ConnectionState) {
		setState({ ...state, connection });
	}

	function setError(error: XmppError) {
		setConnection({ ...state.connection, error });
	}

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

		setState({
			...createInitialState(),
			account,
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
			setConnection({
				status: "error",
				error: isXmppError(error)
					? error
					: normalizeXmppError(error, "connection-failed"),
				jid: account.bareJid,
			});
		}
	}

	async function disconnect() {
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

	async function sendMessage(
		to: string,
		body: string,
	): Promise<ChatMessage | null> {
		const trimmed = body.trim();
		if (!trimmed) return null;
		if (state.connection.status !== "connected") {
			setError(createXmppError("not-connected"));
			return null;
		}

		const accountJid = state.account?.bareJid ?? state.connection.jid ?? "";
		const id = `local-${idFactory()}`;
		const message: ChatMessage = {
			id,
			conversationJid: bareJid(to),
			from: accountJid,
			to: bareJid(to),
			body: trimmed,
			timestamp: now(),
			direction: "outgoing",
			status: "pending",
		};
		handleEvent({ type: "message", message });

		try {
			await deps.adapter.sendMessage({
				to: bareJid(to),
				body: trimmed,
				id,
			});
			return message;
		} catch (error) {
			setError(normalizeXmppError(error, "send-failed"));
			handleEvent({ type: "message-status", id, status: "failed" });
			return message;
		}
	}

	async function retryMessage(messageId: string) {
		const message = findMessage(state, messageId);
		if (!message || message.direction !== "outgoing") return;

		handleEvent({ type: "message-status", id: messageId, status: "pending" });
		try {
			await deps.adapter.sendMessage({
				to: message.conversationJid,
				body: message.body,
				id: message.id,
			});
		} catch (error) {
			setError(normalizeXmppError(error, "send-failed"));
			handleEvent({ type: "message-status", id: messageId, status: "failed" });
		}
	}

	async function sendTyping(to: string, typing: boolean) {
		if (state.connection.status !== "connected") return;
		const chatState: ChatState = typing ? "composing" : "active";
		try {
			await deps.adapter.sendChatState(bareJid(to), chatState);
		} catch {
			// Typing state is best-effort and must not surface as a send failure.
		}
	}

	function setActiveConversation(jid: string | null) {
		setState(reduceActive(state, jid));
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
		disconnect,
		sendMessage,
		retryMessage,
		sendTyping,
		setActiveConversation,
		addContact,
		acceptSubscription,
		clearError,
	};
}

function findMessage(state: XmppState, messageId: string) {
	for (const conversation of Object.values(state.conversations)) {
		const message = conversation.messages.find((item) => item.id === messageId);
		if (message) return message;
	}
	return undefined;
}
