import type { Agent } from "stanza";
import * as XMPP from "stanza";
import type * as StanzaProtocol from "stanza/protocol";
import { MAX_RECONNECT_ATTEMPTS } from "#/lib/xmpp/backoff";
import { createClientActions } from "#/lib/xmpp/client-actions";
import { resolveConnectTransports } from "#/lib/xmpp/connection-resolver";
import { createXmppError, isXmppError } from "#/lib/xmpp/errors";
import { bareJid, toAccount } from "#/lib/xmpp/jid";
import { createMucAdapter } from "#/lib/xmpp/muc-adapter";
import { createOmemoActions } from "#/lib/xmpp/omemo-actions";
import { registerMessageExtensions } from "#/lib/xmpp/protocol";
import { createReconnectController } from "#/lib/xmpp/reconnect";
import { createRosterAdapter } from "#/lib/xmpp/roster-adapter";
import { attachStanzaEvents } from "#/lib/xmpp/stanza-events";
import { mapHistory, mapHistoryActions } from "#/lib/xmpp/stanza-mappers";
import type { XmppAdapter, XmppEvent } from "#/types/store";
import type { ConnectCredentials, XmppError } from "#/types/xmpp";

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
	let connecting = false;
	let connectionGeneration = 0;
	let pending: PendingConnection | null = null;
	let activeWebsocketUrl: string | null = null;
	const listeners = new Set<(event: XmppEvent) => void>();
	const roster = createRosterAdapter(() => client);
	const muc = createMucAdapter({
		getClient: () => client,
		getAccountBareJid: () => accountBareJid,
		emit,
	});
	const omemo = createOmemoActions(
		() => client,
		() => accountBareJid,
	);

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

	const reconnect = createReconnectController({
		connect: (nextCredentials, retry) => connect(nextCredentials, retry),
		getCredentials: () => credentials,
		isConnecting: () => connecting,
		onReconnecting: () =>
			emit({ type: "connection", status: "reconnecting", jid: accountBareJid }),
		onExhausted: () =>
			failConnection(
				createXmppError(
					"connection-failed",
					undefined,
					`Could not reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts. Check your connection and try again.`,
				),
			),
	});

	/**
	 * Terminal failures must never start another socket. Auth and stream errors
	 * are not transient: retrying them can hammer the server and lock accounts.
	 */
	function failConnection(error: XmppError) {
		manualDisconnect = true;
		reconnect.stop();
		credentials = null;
		clearPending(error);
		emit({ type: "connection", status: "error", error, jid: accountBareJid });
		void disconnectClient().catch(() => undefined);
	}

	function attachEvents(agent: Agent, generation: number) {
		const isCurrent = () => generation === connectionGeneration;
		attachStanzaEvents(agent, {
			emit,
			getAccountBareJid: () => accountBareJid,
			getRoomNick: muc.getRoomNick,
			onSessionStarted: () => {
				if (!isCurrent()) return;
				reconnect.reset();
				clearPending();
				emit({ type: "connection", status: "connected", jid: accountBareJid });
				agent.sendPresence();
				void agent.enableCarbons().catch(() => undefined);
				void muc.joinBookmarks().catch(() => undefined);
				void agent
					.searchHistory({ paging: { max: 50, before: "" } })
					.then((history) => {
						const messages = mapHistory(history, accountBareJid);
						if (messages.length > 0) emit({ type: "history", messages });
						for (const event of mapHistoryActions(history, accountBareJid)) {
							emit(event);
						}
					})
					.catch(() => undefined);
			},
			onAuthFailed: () => {
				if (!isCurrent()) return;
				failConnection(createXmppError("auth-failed"));
			},
			onStreamError: (streamError: StanzaProtocol.StreamError) => {
				if (!isCurrent()) return;
				failConnection(
					createXmppError(
						"connection-failed",
						streamError,
						streamError.text ?? "The XMPP stream failed.",
					),
				);
			},
			onDisconnected: () => {
				if (!isCurrent() || reconnect.isStopped()) return;
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
				reconnect.schedule();
			},
		});
	}
	async function connect(
		nextCredentials: ConnectCredentials,
		isReconnect = false,
	): Promise<void> {
		if (connecting) {
			throw createXmppError(
				"connection-failed",
				undefined,
				"A connection attempt is already in progress.",
			);
		}

		connecting = true;
		const generation = ++connectionGeneration;
		let retryReconnect = false;
		if (!isReconnect) reconnect.reset();
		manualDisconnect = false;
		credentials = nextCredentials;
		const account = toAccount(nextCredentials.jid);
		accountBareJid = account?.bareJid ?? bareJid(nextCredentials.jid);

		try {
			await disconnectClient();
			if (generation !== connectionGeneration) return;

			const domain =
				account?.domain ?? bareJid(nextCredentials.jid).split("@")[1] ?? "";
			const transports = await resolveConnectTransports(
				nextCredentials,
				domain,
			);
			if (generation !== connectionGeneration) return;
			if (!transports.websocketUrl && !transports.boshUrl) {
				throw createXmppError(
					"connection-failed",
					undefined,
					transports.discoveryError ??
						"No WebSocket or BOSH endpoint was found. Enter the server's WebSocket URL in Connection options.",
				);
			}
			activeWebsocketUrl = transports.websocketUrl ?? null;

			const agent = XMPP.createClient({
				jid: nextCredentials.jid,
				password: nextCredentials.password,
				resource: nextCredentials.resource || createResourceId(),
				transports: {
					websocket: transports.websocketUrl ?? false,
					bosh: transports.websocketUrl ? false : (transports.boshUrl ?? false),
				},
				useStreamManagement: true,
				allowResumption: true,
				sendReceipts: true,
				chatMarkers: true,
				timeout: 20,
				softwareVersion: { name: "Avio", version: __APP_VERSION__ },
			});

			client = agent;
			registerMessageExtensions(agent);
			attachEvents(agent, generation);
			emit({ type: "connection", status: "connecting", jid: accountBareJid });

			const connected = new Promise<void>((resolve, reject) => {
				const timer = setTimeout(() => {
					pending = null;
					reject(new Error("The XMPP connection timed out."));
				}, CONNECT_TIMEOUT_MS);
				pending = { resolve, reject, timer };
			});

			await Promise.resolve(agent.connect());
			await connected;
		} catch (error) {
			clearPending();
			if (generation === connectionGeneration) {
				await disconnectClient();
			}
			if (isReconnect && !reconnect.isStopped()) retryReconnect = true;
			if (isXmppError(error)) throw error;
			throw createXmppError(
				"connection-failed",
				error,
				error instanceof Error ? error.message : undefined,
			);
		} finally {
			if (generation === connectionGeneration) {
				connecting = false;
				if (retryReconnect) reconnect.schedule();
			}
		}
	}
	async function disconnectClient() {
		reconnect.cancel();
		activeWebsocketUrl = null;
		if (!client) return;
		const current = client;
		client = null;
		current.removeAllListeners();
		await Promise.resolve(current.disconnect());
	}
	async function disconnect(): Promise<void> {
		manualDisconnect = true;
		reconnect.stop();
		connecting = false;
		connectionGeneration += 1;
		credentials = null;
		clearPending(new Error("Disconnected."));
		await disconnectClient();
		emit({ type: "connection", status: "disconnected" });
	}
	const actions = createClientActions({
		getClient: () => client,
		getAccountBareJid: () => accountBareJid,
		getActiveWebsocketUrl: () => activeWebsocketUrl,
		muc,
		omemo,
		roster,
		listeners,
	});

	return { connect, disconnect, ...actions };
}
