import type { Agent } from "stanza";
import type * as StanzaProtocol from "stanza/protocol";
import { normalizePresence } from "#/lib/xmpp/presence";
import {
	mapRoster,
	normalizeStanzaMessage,
	withFallbackAddress,
} from "#/lib/xmpp/stanza-mappers";
import type { XmppEvent } from "#/types/store";

export interface StanzaEventHandlers {
	emit: (event: XmppEvent) => void;
	getAccountBareJid: () => string;
	onSessionStarted: () => void;
	onAuthFailed: () => void;
	onStreamError: (error: StanzaProtocol.StreamError) => void;
	onDisconnected: () => void;
}

export function attachStanzaEvents(
	agent: Agent,
	handlers: StanzaEventHandlers,
) {
	const { emit } = handlers;
	const accountBareJid = () => handlers.getAccountBareJid();

	agent.on("session:started", handlers.onSessionStarted);

	agent.on("auth:failed", handlers.onAuthFailed);
	agent.on("stream:error", handlers.onStreamError);
	agent.on("disconnected", handlers.onDisconnected);

	agent.on("chat", (message) => {
		const normalized = normalizeStanzaMessage(message, accountBareJid());
		if (normalized) emit({ type: "message", message: normalized });
	});

	agent.on("carbon:received", (event) => {
		const inner = event.carbon.forward.message;
		if (!inner) return;
		const normalized = normalizeStanzaMessage(
			withFallbackAddress(inner, event.from, event.to),
			accountBareJid(),
			{ isCarbon: true },
		);
		if (normalized) emit({ type: "message", message: normalized });
	});

	agent.on("carbon:sent", (event) => {
		const inner = event.carbon.forward.message;
		if (!inner) return;
		const normalized = normalizeStanzaMessage(
			withFallbackAddress(inner, event.from, event.to),
			accountBareJid(),
			{ isCarbon: true, direction: "outgoing" },
		);
		if (normalized) emit({ type: "message", message: normalized });
	});

	agent.on("message:sent", (message) => {
		emit({
			type: "message-status",
			id: message.id,
			stanzaId: message.id,
			status: "sent",
		});
	});

	agent.on("message:error", (message) => {
		emit({
			type: "message-status",
			id: message.id,
			stanzaId: message.id,
			status: "failed",
		});
	});

	agent.on("message:failed", (message) => {
		emit({
			type: "message-status",
			id: message.id,
			stanzaId: message.id,
			status: "failed",
		});
	});

	agent.on("receipt", (message) => {
		emit({
			type: "message-status",
			id: message.receipt.id,
			stanzaId: message.receipt.id,
			status: "delivered",
		});
	});

	agent.on("marker:received", (message) => {
		emit({
			type: "message-status",
			id: message.marker?.id,
			stanzaId: message.marker?.id,
			status: "delivered",
		});
	});

	agent.on("marker:displayed", (message) => {
		emit({
			type: "message-status",
			id: message.marker?.id,
			stanzaId: message.marker?.id,
			status: "read",
		});
	});

	agent.on("roster:update", (event) => {
		emit({ type: "roster", contacts: mapRoster(event.roster.items ?? []) });
	});

	agent.on("available", (presence) => {
		emit({
			type: "presence",
			jid: presence.from,
			presence: normalizePresence({
				show: presence.show,
				status: presence.status,
				priority: presence.priority,
			}),
		});
	});

	agent.on("unavailable", (presence) => {
		emit({
			type: "presence",
			jid: presence.from,
			presence: normalizePresence({
				available: false,
				status: presence.status,
			}),
		});
	});

	agent.on("chat:state", (message) => {
		emit({
			type: "typing",
			jid: message.from,
			typing: message.chatState === "composing",
		});
	});

	for (const action of [
		"subscribe",
		"subscribed",
		"unsubscribe",
		"unsubscribed",
	] as const) {
		agent.on(action, (presence) => {
			emit({ type: "subscription", jid: presence.from, action });
		});
	}
}
