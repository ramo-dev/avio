import type { Agent } from "stanza";
import type { ChatMessage } from "#/types/chat";
import type { SendMessageInput, XmppEvent } from "#/types/store";
import type { ChatState } from "#/types/xmpp";
import {
	sendChatMessageStanza,
	sendChatStateStanza,
	sendDisplayedMarkerStanza,
} from "./client-stanzas";
import { createXmppError } from "./errors";
import { sendForwardedStanza, sendReactionStanza } from "./message-stanzas";
import type { createMucAdapter } from "./muc-adapter";
import type { createOmemoActions } from "./omemo-actions";
import { loadRoomPreview as loadRoomPreviewWithClient } from "./room-preview";
import type { createRosterAdapter } from "./roster-adapter";
import { detectServerCapabilities } from "./server-capabilities";
import { requestUploadService, requestUploadSlot } from "./upload-adapter";

export function createClientActions({
	getClient,
	getAccountBareJid,
	getActiveWebsocketUrl,
	muc,
	omemo,
	roster,
	listeners,
}: {
	getClient: () => Agent | null;
	getAccountBareJid: () => string;
	getActiveWebsocketUrl: () => string | null;
	muc: ReturnType<typeof createMucAdapter>;
	omemo: ReturnType<typeof createOmemoActions>;
	roster: ReturnType<typeof createRosterAdapter>;
	listeners: Set<(event: XmppEvent) => void>;
}) {
	function requireClient(): Agent {
		const client = getClient();
		if (!client) throw createXmppError("not-connected");
		return client;
	}

	async function sendMessage(input: SendMessageInput) {
		sendChatMessageStanza(requireClient(), input);
	}

	async function sendReaction(
		to: string,
		messageId: string,
		reactions: string[],
		roomType?: "chat" | "groupchat",
	): Promise<void> {
		sendReactionStanza(requireClient(), to, messageId, reactions, roomType);
	}

	async function sendDisplayedMarker(
		to: string,
		messageId: string,
	): Promise<void> {
		sendDisplayedMarkerStanza(requireClient(), to, messageId);
	}

	async function forwardMessage(
		to: string,
		source: ChatMessage,
		id?: string,
	): Promise<void> {
		sendForwardedStanza(requireClient(), to, source, id);
	}

	async function sendChatState(to: string, state: ChatState) {
		sendChatStateStanza(requireClient(), to, state);
	}

	async function loadRoomPreview(jid: string) {
		return loadRoomPreviewWithClient(requireClient(), jid, getAccountBareJid());
	}

	async function getServerCapabilities() {
		const accountJid = getAccountBareJid();
		const activeWebsocketUrl = getActiveWebsocketUrl();
		return detectServerCapabilities({
			client: requireClient(),
			domain: accountJid.split("@")[1] ?? accountJid,
			accountJid,
			transport: activeWebsocketUrl ? "websocket" : "bosh",
			tls: activeWebsocketUrl?.startsWith("wss:") ?? false,
		});
	}

	return {
		sendMessage,
		...omemo,
		sendReaction,
		sendDisplayedMarker,
		forwardMessage,
		sendChatState,
		...roster,
		createRoom: muc.createRoom,
		leaveRoom: muc.leaveRoom,
		inviteToRoom: muc.inviteToRoom,
		acceptRoomInvite: (jid: string, reason: string, invitedBy?: string) =>
			muc.joinInvitedRoom(jid, reason, invitedBy),
		declineRoomInvite: async (
			jid: string,
			sender: string | undefined,
			reason?: string,
		) => {
			if (!sender) return;
			muc.declineInvite(jid, sender, reason);
		},
		getUploadService: () => requestUploadService(getClient()),
		getUploadSlot: (
			serviceJid: string,
			request: { name: string; size: number; mediaType?: string },
		) => requestUploadSlot(getClient(), serviceJid, request),
		loadRoomPreview,
		getServerCapabilities,
		getRoomMemberJids: muc.getRoomMemberJids,
		subscribe(listener: (event: XmppEvent) => void) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}
