import type { Agent } from "stanza";
import type * as StanzaProtocol from "stanza/protocol";
import { bareJid, jidResource } from "#/lib/xmpp/jid";
import { createOmemoEventEmitter } from "#/lib/xmpp/omemo-events";
import { normalizePresence } from "#/lib/xmpp/presence";
import {
	mapRoster,
	normalizeGroupMessage,
	normalizeStanzaMessage,
	withFallbackAddress,
} from "#/lib/xmpp/stanza-mappers";
import type { XmppEvent } from "#/types/store";

export interface StanzaEventHandlers {
	emit: (event: XmppEvent) => void;
	getAccountBareJid: () => string;
	getRoomNick: (roomJid: string) => string | undefined;
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
	const emitOmemo = createOmemoEventEmitter(emit, accountBareJid);

	function emitExtended(
		message: StanzaProtocol.Message,
		fallbackFrom: string,
		fallbackTo: string,
	): boolean {
		const from = message.from ?? fallbackFrom;
		const to = message.to ?? fallbackTo;
		const outgoing =
			bareJid(from).toLowerCase() === accountBareJid().toLowerCase();
		const jid = outgoing ? bareJid(to) : bareJid(from);

		if (message.reactions?.id) {
			emit({
				type: "reactions",
				jid,
				messageId: message.reactions.id,
				senderJid: outgoing ? accountBareJid() : bareJid(from),
				reactions: message.reactions.reactions ?? [],
			});
			return true;
		}

		if (message.replace) {
			const body = message.body?.trim();
			if (body) emit({ type: "edit", jid, messageId: message.replace, body });
			return true;
		}

		return false;
	}

	agent.on("session:started", handlers.onSessionStarted);

	agent.on("auth:failed", handlers.onAuthFailed);
	agent.on("stream:error", handlers.onStreamError);
	agent.on("disconnected", handlers.onDisconnected);

	agent.on("message", (message) => {
		if (message.carbon) return;
		if (emitOmemo(message, message.from ?? "", message.to ?? "")) return;
		if (message.reactions || message.replace) {
			emitExtended(message, message.from ?? "", message.to ?? "");
		}
	});

	agent.on("chat", (message) => {
		if (message.omemo) return;
		if (message.reactions || message.replace) return;
		const normalized = normalizeStanzaMessage(message, accountBareJid());
		if (normalized) emit({ type: "message", message: normalized });
	});

	agent.on("groupchat", (message) => {
		if (message.omemo) return;
		const roomJid = bareJid(message.from ?? "");
		const normalized = normalizeGroupMessage(
			message,
			accountBareJid(),
			handlers.getRoomNick(roomJid),
		);
		if (normalized) emit({ type: "message", message: normalized });
	});

	agent.on("carbon:received", (event) => {
		const inner = event.carbon.forward.message;
		if (!inner) return;
		if (emitOmemo(inner, event.from, event.to, "incoming")) return;
		if (emitExtended(inner, event.from, event.to)) return;
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
		if (emitOmemo(inner, event.from, event.to, "outgoing")) return;
		if (emitExtended(inner, event.from, event.to)) return;
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

	agent.on("muc:available", (presence) => {
		const roomJid = bareJid(presence.from);
		const nick = presence.muc?.nick ?? jidResource(presence.from);
		if (!nick) return;

		emit({
			type: "room-occupant",
			jid: roomJid,
			action: "join",
			occupant: {
				nick,
				jid: presence.muc?.jid ? bareJid(presence.muc.jid) : undefined,
				role: presence.muc?.role,
				affiliation: presence.muc?.affiliation,
				presence: normalizePresence({
					show: presence.show,
					status: presence.status,
					priority: presence.priority,
				}),
			},
		});
	});

	agent.on("muc:unavailable", (presence) => {
		const roomJid = bareJid(presence.from);
		const nick = presence.muc?.nick ?? jidResource(presence.from);
		if (!nick) return;

		emit({
			type: "room-occupant",
			jid: roomJid,
			action: "leave",
			occupant: {
				nick,
				presence: normalizePresence({ available: false }),
			},
		});
	});

	agent.on("muc:topic", (event) => {
		emit({
			type: "room-subject",
			jid: bareJid(event.room),
			subject: event.topic ?? "",
		});
	});

	agent.on("muc:invite", (event) => {
		const roomJid = bareJid(event.room);
		emit({
			type: "room-invite-request",
			request: {
				roomJid,
				roomName: event.reason?.trim() || roomJid.split("@")[0] || roomJid,
				from: event.from,
				reason: event.reason,
				receivedAt: Date.now(),
			},
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
