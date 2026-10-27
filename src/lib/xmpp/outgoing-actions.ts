import { createXmppError, normalizeXmppError } from "#/lib/xmpp/errors";
import { bareJid } from "#/lib/xmpp/jid";
import { createOutgoingMessage } from "#/lib/xmpp/messages";
import { findMessageById } from "#/lib/xmpp/selectors";
import type { MessageAttachment } from "#/types/attachment";
import type { ChatMessage } from "#/types/chat";
import type {
	SendMessageOptions,
	XmppAdapter,
	XmppEvent,
	XmppState,
} from "#/types/store";
import type { XmppError } from "#/types/xmpp";

interface OutgoingActionDeps {
	getState: () => XmppState;
	handleEvent: (event: XmppEvent) => void;
	adapter: XmppAdapter;
	now: () => number;
	idFactory: () => string;
	onError: (error: XmppError) => void;
}

export function createOutgoingActions(deps: OutgoingActionDeps) {
	const { getState, handleEvent, adapter, now, idFactory, onError } = deps;

	function findInConversation(
		state: XmppState,
		to: string,
		messageId: string,
	): ChatMessage | undefined {
		const conversation = state.conversations[bareJid(to)];
		return conversation?.messages.find(
			(message) => message.id === messageId || message.stanzaId === messageId,
		);
	}

	async function sendMessage(
		to: string,
		body: string,
		attachments?: MessageAttachment[],
		options?: SendMessageOptions,
	): Promise<ChatMessage | null> {
		const state = getState();
		const trimmed = body.trim();
		if (state.connection.status !== "connected") {
			onError(createXmppError("not-connected"));
			return null;
		}

		if (options?.editId) {
			const existing = findInConversation(state, to, options.editId);
			if (!existing || existing.direction !== "outgoing" || !trimmed) {
				return null;
			}
			const targetId = existing.stanzaId ?? existing.id;
			handleEvent({
				type: "edit",
				jid: existing.conversationJid,
				messageId: existing.id,
				body: trimmed,
			});
			try {
				await adapter.sendMessage({
					to: existing.conversationJid,
					body: trimmed,
					id: `edit-${idFactory()}`,
					editId: targetId,
				});
				return findInConversation(getState(), to, existing.id) ?? null;
			} catch (error) {
				onError(normalizeXmppError(error, "send-failed"));
				handleEvent({
					type: "message-status",
					id: existing.id,
					status: "failed",
				});
				return findInConversation(getState(), to, existing.id) ?? null;
			}
		}

		if (!trimmed && (!attachments || attachments.length === 0)) return null;

		const accountJid = state.account?.bareJid ?? state.connection.jid ?? "";
		const id = `local-${idFactory()}`;
		const message = createOutgoingMessage({
			id,
			conversationJid: bareJid(to),
			from: accountJid,
			to: bareJid(to),
			body: trimmed,
			attachments,
			replyTo: options?.replyTo,
			timestamp: now(),
		});
		handleEvent({ type: "message", message });

		try {
			await adapter.sendMessage({
				to: bareJid(to),
				body: trimmed,
				id,
				attachments,
				replyTo: options?.replyTo,
			});
			return message;
		} catch (error) {
			onError(normalizeXmppError(error, "send-failed"));
			handleEvent({ type: "message-status", id, status: "failed" });
			return message;
		}
	}

	async function retryMessage(messageId: string) {
		const message = findMessageById(getState(), messageId);
		if (!message || message.direction !== "outgoing") return;

		handleEvent({ type: "message-status", id: messageId, status: "pending" });
		try {
			await adapter.sendMessage({
				to: message.conversationJid,
				body: message.body,
				id: message.edited ? `edit-${idFactory()}` : message.id,
				attachments: message.attachments,
				replyTo: message.replyTo,
				editId: message.edited ? message.id : undefined,
			});
		} catch (error) {
			onError(normalizeXmppError(error, "send-failed"));
			handleEvent({ type: "message-status", id: messageId, status: "failed" });
		}
	}

	async function sendTyping(to: string, typing: boolean) {
		if (getState().connection.status !== "connected") return;
		try {
			await adapter.sendChatState(bareJid(to), typing ? "composing" : "active");
		} catch {
			// Typing state is best-effort and must not surface as a send failure.
		}
	}

	async function toggleReaction(to: string, messageId: string, emoji: string) {
		const state = getState();
		if (state.connection.status !== "connected") {
			onError(createXmppError("not-connected"));
			return;
		}
		const message = findInConversation(state, to, messageId);
		if (!message) return;
		const accountJid = state.account?.bareJid ?? state.connection.jid ?? "";
		const current = message.reactions?.[accountJid] ?? [];
		const next = current.includes(emoji)
			? current.filter((reaction) => reaction !== emoji)
			: [...current, emoji];
		const event: XmppEvent = {
			type: "reactions",
			jid: message.conversationJid,
			messageId: message.id,
			senderJid: accountJid,
			reactions: next,
		};
		handleEvent(event);

		try {
			await adapter.sendReaction(
				bareJid(to),
				message.stanzaId ?? message.id,
				next,
			);
		} catch (error) {
			onError(normalizeXmppError(error, "send-failed"));
			handleEvent({ ...event, reactions: current });
		}
	}

	async function forwardMessage(
		to: string,
		source: ChatMessage,
	): Promise<ChatMessage | null> {
		const state = getState();
		if (state.connection.status !== "connected") {
			onError(createXmppError("not-connected"));
			return null;
		}

		const target = bareJid(to);
		const accountJid = state.account?.bareJid ?? state.connection.jid ?? "";
		const id = `local-${idFactory()}`;
		const message: ChatMessage = {
			...createOutgoingMessage({
				id,
				conversationJid: target,
				from: accountJid,
				to: target,
				body: source.body,
				attachments: source.attachments,
				timestamp: now(),
			}),
			forwarded: true,
		};
		handleEvent({ type: "message", message });

		try {
			await adapter.forwardMessage(target, source);
			return message;
		} catch (error) {
			onError(normalizeXmppError(error, "send-failed"));
			handleEvent({ type: "message-status", id, status: "failed" });
			return message;
		}
	}

	return {
		sendMessage,
		retryMessage,
		sendTyping,
		toggleReaction,
		forwardMessage,
	};
}
