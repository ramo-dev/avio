import { createXmppError, normalizeXmppError } from "#/lib/xmpp/errors";
import { bareJid } from "#/lib/xmpp/jid";
import { createOutgoingMessage } from "#/lib/xmpp/messages";
import type { ChatMessage } from "#/types/chat";
import type { OmemoEncryptedMessage } from "#/types/omemo";
import type {
	SendMessageOptions,
	XmppAdapter,
	XmppEvent,
	XmppState,
} from "#/types/store";
import type { XmppError } from "#/types/xmpp";

export interface EncryptedSenderDeps {
	getState: () => XmppState;
	handleEvent: (event: XmppEvent) => void;
	adapter: XmppAdapter;
	now: () => number;
	idFactory: () => string;
	onError: (error: XmppError) => void;
	findInConversation: (
		state: XmppState,
		to: string,
		messageId: string,
	) => ChatMessage | undefined;
}

/** Sends an envelope encrypted by the OMEMO provider without plaintext fallback. */
export function createEncryptedSender(deps: EncryptedSenderDeps) {
	const {
		getState,
		handleEvent,
		adapter,
		now,
		idFactory,
		onError,
		findInConversation,
	} = deps;

	async function sendEncryptedMessage(
		to: string,
		body: string,
		envelope: OmemoEncryptedMessage,
		options?: SendMessageOptions,
	): Promise<ChatMessage | null> {
		const state = getState();
		if (state.connection.status !== "connected") {
			onError(createXmppError("not-connected"));
			return null;
		}

		const target = bareJid(to);
		const trimmed = body.trim();

		if (options?.editId) {
			const existing = findInConversation(state, to, options.editId);
			if (!existing || existing.direction !== "outgoing" || !trimmed) {
				return null;
			}
			handleEvent({
				type: "edit",
				jid: existing.conversationJid,
				messageId: existing.id,
				body: trimmed,
			});
			try {
				await adapter.sendEncryptedMessage(
					target,
					`edit-${idFactory()}`,
					envelope,
				);
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

		const accountJid = state.account?.bareJid ?? state.connection.jid ?? "";
		const id = `local-${idFactory()}`;
		const message: ChatMessage = {
			...createOutgoingMessage({
				id,
				conversationJid: target,
				from: accountJid,
				to: target,
				body: trimmed,
				replyTo: options?.replyTo,
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
	return sendEncryptedMessage;
}
