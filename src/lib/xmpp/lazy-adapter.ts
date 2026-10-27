import type { UploadService, UploadSlot } from "#/types/attachment";
import type { XmppAdapter, XmppEvent } from "#/types/store";

export function createLazyAdapter(): XmppAdapter {
	let inner: XmppAdapter | null = null;
	let pending: Promise<XmppAdapter> | null = null;
	const listeners = new Set<(event: XmppEvent) => void>();
	const unsubscribers = new Map<(event: XmppEvent) => void, () => void>();

	async function ensure(): Promise<XmppAdapter> {
		if (inner) return inner;
		pending ??= import("#/lib/xmpp/client").then(({ createStanzaAdapter }) => {
			const adapter = createStanzaAdapter();
			inner = adapter;
			for (const listener of listeners) {
				unsubscribers.set(listener, adapter.subscribe(listener));
			}
			return adapter;
		});
		return pending;
	}

	return {
		async connect(credentials) {
			const adapter = await ensure();
			await adapter.connect(credentials);
		},
		async disconnect() {
			if (inner) {
				await inner.disconnect();
				return;
			}
			if (pending) {
				const adapter = await pending;
				await adapter.disconnect();
			}
		},
		async sendMessage(input) {
			const adapter = await ensure();
			await adapter.sendMessage(input);
		},
		async sendReaction(to, messageId, reactions) {
			const adapter = await ensure();
			await adapter.sendReaction(to, messageId, reactions);
		},
		async forwardMessage(to, message) {
			const adapter = await ensure();
			await adapter.forwardMessage(to, message);
		},
		async sendChatState(to, state) {
			const adapter = await ensure();
			await adapter.sendChatState(to, state);
		},
		async getRoster() {
			const adapter = await ensure();
			return adapter.getRoster();
		},
		async getUploadService(): Promise<UploadService> {
			const adapter = await ensure();
			return adapter.getUploadService();
		},
		async getUploadSlot(
			serviceJid: string,
			request: { name: string; size: number; mediaType?: string },
		): Promise<UploadSlot> {
			const adapter = await ensure();
			return adapter.getUploadSlot(serviceJid, request);
		},
		async addContact(jid) {
			const adapter = await ensure();
			await adapter.addContact(jid);
		},
		async acceptSubscription(jid) {
			const adapter = await ensure();
			await adapter.acceptSubscription(jid);
		},
		subscribe(listener) {
			listeners.add(listener);
			if (inner) {
				unsubscribers.set(listener, inner.subscribe(listener));
			}
			return () => {
				listeners.delete(listener);
				unsubscribers.get(listener)?.();
				unsubscribers.delete(listener);
			};
		},
	};
}
