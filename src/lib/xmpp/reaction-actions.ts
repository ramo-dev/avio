import { createXmppError, normalizeXmppError } from "#/lib/xmpp/errors";
import { bareJid } from "#/lib/xmpp/jid";
import type { ChatMessage } from "#/types/chat";
import type { XmppAdapter, XmppEvent, XmppState } from "#/types/store";
import type { XmppError } from "#/types/xmpp";

const DEFAULT_REACTION_DELAY_MS = 400;

interface PendingReaction {
	timer: ReturnType<typeof setTimeout> | null;
	original: string[];
	sending: boolean;
	dirty: boolean;
	to: string;
	messageId: string;
	accountJid: string;
}

interface ReactionActionDeps {
	getState: () => XmppState;
	handleEvent: (event: XmppEvent) => void;
	adapter: XmppAdapter;
	onError: (error: XmppError) => void;
	delayMs?: number;
}

export function createReactionActions(deps: ReactionActionDeps) {
	const { getState, handleEvent, adapter, onError } = deps;
	const delayMs = deps.delayMs ?? DEFAULT_REACTION_DELAY_MS;
	const pending = new Map<string, PendingReaction>();

	function key(message: ChatMessage) {
		return `${message.conversationJid}:${message.id}`;
	}

	function findMessage(state: XmppState, to: string, messageId: string) {
		return state.conversations[bareJid(to)]?.messages.find(
			(message) => message.id === messageId || message.stanzaId === messageId,
		);
	}

	async function flush(key: string) {
		const entry = pending.get(key);
		if (!entry) return;

		const message = findMessage(getState(), entry.to, entry.messageId);
		if (!message) {
			pending.delete(key);
			return;
		}

		const current = message.reactions?.[entry.accountJid] ?? [];
		entry.timer = null;
		entry.sending = true;

		try {
			await adapter.sendReaction(
				entry.to,
				message.stanzaId ?? message.id,
				current,
			);
			entry.sending = false;
			if (entry.dirty) {
				entry.dirty = false;
				schedule(key, entry);
			} else {
				pending.delete(key);
			}
		} catch (error) {
			pending.delete(key);
			onError(normalizeXmppError(error, "send-failed"));
			handleEvent({
				type: "reactions",
				jid: message.conversationJid,
				messageId: message.id,
				senderJid: entry.accountJid,
				reactions: entry.original,
			});
		}
	}

	function schedule(key: string, entry: PendingReaction) {
		if (entry.sending) {
			entry.dirty = true;
			return;
		}
		if (entry.timer) clearTimeout(entry.timer);
		entry.timer = setTimeout(() => {
			entry.timer = null;
			void flush(key);
		}, delayMs);
	}

	async function toggleReaction(to: string, messageId: string, emoji: string) {
		const state = getState();
		if (state.connection.status !== "connected") {
			onError(createXmppError("not-connected"));
			return;
		}
		const message = findMessage(state, to, messageId);
		if (!message) return;

		const accountJid = state.account?.bareJid ?? state.connection.jid ?? "";
		const keyValue = key(message);
		const current = message.reactions?.[accountJid] ?? [];
		const next = current.includes(emoji) ? [] : [emoji];

		let entry = pending.get(keyValue);
		if (!entry) {
			entry = {
				timer: null,
				original: current,
				sending: false,
				dirty: false,
				to: bareJid(to),
				messageId: message.id,
				accountJid,
			};
			pending.set(keyValue, entry);
		}

		handleEvent({
			type: "reactions",
			jid: message.conversationJid,
			messageId: message.id,
			senderJid: accountJid,
			reactions: next,
		});

		if (delayMs <= 0) {
			await flush(keyValue);
			return;
		}
		schedule(keyValue, entry);
	}

	return { toggleReaction };
}
