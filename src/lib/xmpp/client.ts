import type { Agent } from "stanza";
import * as XMPP from "stanza";
import type * as StanzaProtocol from "stanza/protocol";
import { reconnectDelay } from "#/lib/xmpp/backoff";
import { createXmppError, isXmppError } from "#/lib/xmpp/errors";
import { bareJid, toAccount } from "#/lib/xmpp/jid";
import { attachStanzaEvents } from "#/lib/xmpp/stanza-events";
import { mapHistory, mapRoster } from "#/lib/xmpp/stanza-mappers";
import type { UploadService, UploadSlot } from "#/types/attachment";
import type { ChatMessage, Contact } from "#/types/chat";
import type { SendMessageInput, XmppAdapter, XmppEvent } from "#/types/store";
import type { ChatState, ConnectCredentials, XmppError } from "#/types/xmpp";

const CONNECT_TIMEOUT_MS = 30_000;
const RESOURCE_PREFIX = "avio-web";

interface PendingConnection {
	resolve: () => void;
	reject: (error: Error | XmppError) => void;
	timer: ReturnType<typeof setTimeout>;
}

function createResourceId(): string {
	return `${RESOURCE_PREFIX}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createStanzaAdapter(): XmppAdapter {
	let client: Agent | null = null;
	let credentials: ConnectCredentials | null = null;
	let accountBareJid = "";
	let manualDisconnect = false;
	let reconnectAttempts = 0;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let pending: PendingConnection | null = null;
	const listeners = new Set<(event: XmppEvent) => void>();

	function emit(event: XmppEvent) {
		for (const listener of listeners) listener(event);
	}

	function clearPending(error?: Error | XmppError) {
		if (!pending) return;
		clearTimeout(pending.timer);
		if (error) pending.reject(error);
		else pending.resolve();
		pending = null;
	}

	function scheduleReconnect() {
		if (manualDisconnect || !credentials) return;
		const attempt = reconnectAttempts;
		reconnectAttempts += 1;
		emit({ type: "connection", status: "reconnecting", jid: accountBareJid });
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			if (!credentials || manualDisconnect) return;
			void connect(credentials).catch(() => undefined);
		}, reconnectDelay(attempt));
	}

	function attachEvents(agent: Agent) {
		attachStanzaEvents(agent, {
			emit,
			getAccountBareJid: () => accountBareJid,
			onSessionStarted: () => {
				reconnectAttempts = 0;
				clearPending();
				emit({ type: "connection", status: "connected", jid: accountBareJid });
				agent.sendPresence();
				void agent.enableCarbons().catch(() => undefined);
				void agent
					.searchHistory({ paging: { max: 50, before: "" } })
					.then((history) => {
						const messages = mapHistory(history, accountBareJid);
						if (messages.length > 0) emit({ type: "history", messages });
					})
					.catch(() => undefined);
			},
			onAuthFailed: () => {
				manualDisconnect = true;
				const error = createXmppError("auth-failed");
				emit({ type: "connection", status: "error", error });
				clearPending(error);
			},
			onStreamError: (streamError: StanzaProtocol.StreamError) => {
				const error = createXmppError(
					"connection-failed",
					streamError,
					streamError.text ?? "The XMPP stream failed.",
				);
				emit({ type: "connection", status: "error", error });
				clearPending(error);
			},
			onDisconnected: () => {
				if (manualDisconnect) {
					emit({ type: "connection", status: "disconnected" });
					return;
				}
				if (pending) {
					clearPending(
						new Error(
							"The server closed the connection before login completed. Check the WebSocket URL and server settings.",
						),
					);
				}
				scheduleReconnect();
			},
		});
	}

	async function connect(nextCredentials: ConnectCredentials): Promise<void> {
		manualDisconnect = false;
		credentials = nextCredentials;
		const account = toAccount(nextCredentials.jid);
		accountBareJid = account?.bareJid ?? bareJid(nextCredentials.jid);

		await disconnectClient();

		const agent = XMPP.createClient({
			jid: nextCredentials.jid,
			password: nextCredentials.password,
			resource: nextCredentials.resource || createResourceId(),
			transports: {
				websocket: nextCredentials.websocketUrl || true,
				bosh: nextCredentials.boshUrl || true,
			},
			useStreamManagement: true,
			allowResumption: true,
			sendReceipts: true,
			chatMarkers: true,
			timeout: 20,
			softwareVersion: { name: "Avio", version: "0.1.0" },
		});

		client = agent;
		attachEvents(agent);
		emit({ type: "connection", status: "connecting", jid: accountBareJid });

		const connected = new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => {
				pending = null;
				reject(new Error("The XMPP connection timed out."));
			}, CONNECT_TIMEOUT_MS);
			pending = { resolve, reject, timer };
		});

		try {
			await Promise.resolve(agent.connect());
			await connected;
		} catch (error) {
			clearPending();
			await disconnectClient();
			if (isXmppError(error)) throw error;
			throw createXmppError(
				"connection-failed",
				error,
				error instanceof Error ? error.message : undefined,
			);
		}
	}

	async function disconnectClient() {
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
		if (!client) return;
		const current = client;
		client = null;
		current.removeAllListeners();
		await Promise.resolve(current.disconnect());
	}

	async function disconnect(): Promise<void> {
		manualDisconnect = true;
		credentials = null;
		clearPending(new Error("Disconnected."));
		await disconnectClient();
		emit({ type: "connection", status: "disconnected" });
	}

	async function sendMessage(input: SendMessageInput) {
		if (!client) throw createXmppError("not-connected");
		client.sendMessage({
			to: input.to,
			body: input.body,
			id: input.id,
			type: "chat",
			receipt: { type: "request" },
			marker: { type: "markable" },
			links: input.attachments?.map((attachment) => ({
				url: attachment.url,
				description: attachment.name,
			})),
		});
	}

	async function sendChatState(to: string, state: ChatState) {
		if (!client) return;
		client.sendMessage({ to, type: "chat", chatState: state });
	}

	async function getHistory(
		jid: string,
		before?: number,
		max = 30,
	): Promise<ChatMessage[]> {
		if (!client) throw createXmppError("not-connected");
		const history = await client.searchHistory(accountBareJid, {
			with: bareJid(jid),
			paging: { max, before: "" },
			...(before ? { end: new Date(before - 1) } : {}),
		});
		return mapHistory(history, accountBareJid).filter(
			(message) => message.conversationJid === bareJid(jid),
		);
	}

	async function getRoster(): Promise<Contact[]> {
		if (!client) return [];
		const roster = await client.getRoster();
		return mapRoster(roster.items ?? []);
	}

	async function getUploadService(): Promise<UploadService> {
		if (!client) throw createXmppError("not-connected");
		const service = await client.getUploadService();
		return { jid: service.jid, maxSize: service.maxSize };
	}

	async function getUploadSlot(
		serviceJid: string,
		request: { name: string; size: number; mediaType?: string },
	): Promise<UploadSlot> {
		if (!client) throw createXmppError("not-connected");
		const slot = await client.getUploadSlot(serviceJid, request);
		return {
			download: slot.download,
			upload: {
				url: slot.upload.url,
				headers: slot.upload.headers,
			},
		};
	}

	async function addContact(jid: string) {
		if (!client) throw createXmppError("not-connected");
		client.subscribe(jid);
	}

	async function acceptSubscription(jid: string) {
		if (!client) throw createXmppError("not-connected");
		client.acceptSubscription(jid);
	}

	return {
		connect,
		disconnect,
		sendMessage,
		sendChatState,
		getHistory,
		getRoster,
		getUploadService,
		getUploadSlot,
		addContact,
		acceptSubscription,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}
