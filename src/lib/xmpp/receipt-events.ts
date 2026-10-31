import { applyStoredReceipts } from "#/lib/storage/message-receipts";
import type { MessageReceiptStore } from "#/types/storage";
import type { XmppEvent } from "#/types/store";

/**
 * Persists receipt updates and re-applies them to replaced DM history. MAM does
 * not archive XEP-0333 markers, so without this a refresh reverts read messages
 * to "sent".
 */
export function applyReceiptContext(
	event: XmppEvent,
	accountJid: string | null,
	store: MessageReceiptStore,
): XmppEvent {
	if (!accountJid) return event;

	if (
		event.type === "message-status" &&
		(event.status === "delivered" || event.status === "read")
	) {
		const key = event.stanzaId ?? event.id;
		if (key) store.save(accountJid, key, event.status);
		return event;
	}

	if (event.type === "history") {
		return {
			...event,
			messages: applyStoredReceipts(event.messages, store.load(accountJid)),
		};
	}

	return event;
}
