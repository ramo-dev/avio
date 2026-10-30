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
		async sendEncryptedMessage(to, id, envelope) {
			const adapter = await ensure();
			await adapter.sendEncryptedMessage(to, id, envelope);
		},
		async sendReaction(to, messageId, reactions) {
			const adapter = await ensure();
			await adapter.sendReaction(to, messageId, reactions);
		},
		async forwardMessage(to, message, id) {
			const adapter = await ensure();
			await adapter.forwardMessage(to, message, id);
		},
		async sendChatState(to, state) {
			const adapter = await ensure();
			await adapter.sendChatState(to, state);
		},
		async getRoster() {
			const adapter = await ensure();
			return adapter.getRoster();
		},
		async createRoom(name, memberJids) {
			const adapter = await ensure();
			return adapter.createRoom(name, memberJids);
		},
		async leaveRoom(jid) {
			const adapter = await ensure();
			await adapter.leaveRoom(jid);
		},
		async inviteToRoom(jid, memberJids, reason) {
			const adapter = await ensure();
			await adapter.inviteToRoom(jid, memberJids, reason);
		},
		async acceptRoomInvite(jid, reason, invitedBy) {
			const adapter = await ensure();
			await adapter.acceptRoomInvite(jid, reason, invitedBy);
		},
		async declineRoomInvite(jid, sender, reason) {
			const adapter = await ensure();
			await adapter.declineRoomInvite(jid, sender, reason);
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
		async getOmemoPep() {
			const adapter = await ensure();
			return adapter.getOmemoPep();
		},
		async loadRoomPreview(jid) {
			const adapter = await ensure();
			return adapter.loadRoomPreview(jid);
		},
		async getRoomMemberJids(jid) {
			const adapter = await ensure();
			return adapter.getRoomMemberJids(jid);
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
