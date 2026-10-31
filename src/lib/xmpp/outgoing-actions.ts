import { createXmppError, normalizeXmppError } from "#/lib/xmpp/errors";
import { bareJid } from "#/lib/xmpp/jid";
import { createOutgoingMessage } from "#/lib/xmpp/messages";
import { createReactionActions } from "#/lib/xmpp/reaction-actions";
import { findMessageById } from "#/lib/xmpp/selectors";
import type { MessageAttachment } from "#/types/attachment";
import type { ChatMessage } from "#/types/chat";
import type { OmemoEncryptedMessage } from "#/types/omemo";
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
	reactionDelayMs?: number;
}

export function createOutgoingActions(deps: OutgoingActionDeps) {
	const { getState, handleEvent, adapter, now, idFactory, onError } = deps;
	const reactionDelayMs = deps.reactionDelayMs;
	const reactions = createReactionActions({
		getState,
		handleEvent,
		adapter,
		onError,
		delayMs: reactionDelayMs,
	});

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
		const target = bareJid(to);
		const type =
			state.conversations[target]?.kind === "group" ? "groupchat" : "chat";
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
					type,
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
		if (options?.unencryptedFallback) message.unencryptedFallback = true;
		if (type === "groupchat") message.status = "sent";
		handleEvent({ type: "message", message });

		try {
			await adapter.sendMessage({
				to: bareJid(to),
				body: trimmed,
				id,
				type,
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

	/**
	 * Sends an envelope encrypted by the OMEMO provider.
	 *
	 * This path never calls `sendMessage`, so a failed encrypted send cannot
	 * silently downgrade to plaintext.
	 */
	async function sendEncryptedMessage(
		to: string,
		body: string,
		envelope: OmemoEncryptedMessage,
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
				body,
				timestamp: now(),
			}),
			encrypted: true,
		};
		handleEvent({ type: "message", message });

		try {
			await adapter.sendEncryptedMessage(target, id, envelope);
			return message;
		} catch (error) {
			onError(normalizeXmppError(error, "send-failed"));
			handleEvent({ type: "message-status", id, status: "failed" });
			return findInConversation(getState(), target, id) ?? message;
		}
	}

	async function retryMessage(messageId: string) {
		const message = findMessageById(getState(), messageId);
		if (!message || message.direction !== "outgoing") return;
		// Retrying would not have the original envelope, and plaintext retry is
		// never acceptable for an encrypted message.
		if (message.encrypted) return;

		const type =
			getState().conversations[message.conversationJid]?.kind === "group"
				? "groupchat"
				: "chat";
		handleEvent({ type: "message-status", id: messageId, status: "pending" });
		try {
			await adapter.sendMessage({
				to: message.conversationJid,
				body: message.body,
				id: message.edited ? `edit-${idFactory()}` : message.id,
				type,
				attachments: message.attachments,
				replyTo: message.replyTo,
				editId: message.edited ? message.id : undefined,
			});
			if (type === "groupchat") {
				handleEvent({ type: "message-status", id: messageId, status: "sent" });
			}
		} catch (error) {
			onError(normalizeXmppError(error, "send-failed"));
			handleEvent({ type: "message-status", id: messageId, status: "failed" });
		}
	}

	async function sendTyping(to: string, typing: boolean) {
		const state = getState();
		if (state.connection.status !== "connected") return;
		if (state.conversations[bareJid(to)]?.kind === "group") return;
		try {
			await adapter.sendChatState(bareJid(to), typing ? "composing" : "active");
		} catch {
			// Typing state is best-effort and must not surface as a send failure.
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
		if (source.encrypted) {
			onError(
				createXmppError(
					"send-failed",
					undefined,
					"Encrypted messages cannot be forwarded yet.",
				),
			);
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
			await adapter.forwardMessage(target, source, id);
			return message;
		} catch (error) {
			onError(normalizeXmppError(error, "send-failed"));
			handleEvent({ type: "message-status", id, status: "failed" });
			return message;
		}
	}

	return {
		sendMessage,
		sendEncryptedMessage,
		retryMessage,
		sendTyping,
		toggleReaction: reactions.toggleReaction,
		forwardMessage,
	};
}
