import { normalizeXmppError } from "#/lib/xmpp/errors";
import { bareJid } from "#/lib/xmpp/jid";
import type {
	RoomInfo,
	XmppAdapter,
	XmppEvent,
	XmppState,
} from "#/types/store";
import type { XmppError } from "#/types/xmpp";

export function createGroupActions(
	adapter: XmppAdapter,
	getState: () => XmppState,
	handleEvent: (event: XmppEvent) => void,
	onError: (error: XmppError) => void,
) {
	function addInvites(jid: string, memberJids: string[]) {
		const contacts = getState().contacts;
		const invites = memberJids.map((member) => {
			const memberJid = bareJid(member);
			return {
				jid: memberJid,
				name: contacts[memberJid]?.name,
				status: "pending" as const,
				invitedAt: Date.now(),
			};
		});
		handleEvent({ type: "room-invites", jid, invites });
	}

	async function createGroupChat(
		name: string,
		memberJids: string[],
	): Promise<RoomInfo> {
		try {
			const room = await adapter.createRoom(name, memberJids);
			addInvites(room.jid, memberJids);
			return room;
		} catch (error) {
			const xmppError = normalizeXmppError(error, "unknown");
			onError(xmppError);
			throw xmppError;
		}
	}

	async function leaveGroupChat(jid: string) {
		try {
			await adapter.leaveRoom(jid);
		} catch (error) {
			onError(normalizeXmppError(error, "unknown"));
		}
	}

	async function addGroupMembers(jid: string, memberJids: string[]) {
		const room = getState().rooms[jid];
		try {
			await adapter.inviteToRoom(jid, memberJids, room?.name);
			addInvites(jid, memberJids);
		} catch (error) {
			onError(normalizeXmppError(error, "unknown"));
			throw error;
		}
	}

	async function acceptRoomInvite(jid: string) {
		const request = getState().roomInviteRequests.find(
			(item) => item.roomJid === jid,
		);
		try {
			await adapter.acceptRoomInvite(jid, request?.roomName);
			handleEvent({ type: "room-invite-request-cleared", roomJid: jid });
		} catch (error) {
			onError(normalizeXmppError(error, "unknown"));
			throw error;
		}
	}

	async function declineRoomInvite(jid: string) {
		try {
			await adapter.declineRoomInvite(jid);
		} catch {
			// Declining locally is enough for this client.
		}
		handleEvent({ type: "room-invite-request-cleared", roomJid: jid });
	}

	return {
		createGroupChat,
		leaveGroupChat,
		addGroupMembers,
		acceptRoomInvite,
		declineRoomInvite,
	};
}
