import type { RoomInvite } from "#/types/chat";
import type {
	RoomInviteRequestStore,
	RoomInviteStore,
	XmppEvent,
	XmppState,
} from "#/types/store";

/**
 * Restores invites persisted across reloads onto a fresh `room` event, so a
 * restored room keeps its pending/accepted invite records.
 */
export function restoreRoomInvites(
	store: RoomInviteStore,
	state: XmppState,
	event: XmppEvent,
): XmppEvent {
	if (event.type !== "room" || !state.account) return event;
	const saved = store.load(state.account.bareJid)[event.room.jid] ?? [];
	if (saved.length === 0) return event;
	const invites: Record<string, RoomInvite> = { ...event.room.invites };
	for (const invite of saved) invites[invite.jid] = invite;
	return { ...event, room: { ...event.room, invites } };
}

export function persistRoomInvites(
	store: RoomInviteStore,
	state: XmppState,
): void {
	const accountJid = state.account?.bareJid;
	if (!accountJid) return;
	const rooms = Object.fromEntries(
		Object.entries(state.rooms).map(([roomJid, room]) => [
			roomJid,
			Object.values(room.invites),
		]),
	);
	store.save(accountJid, rooms);
}

export function loadInviteRequests(
	store: RoomInviteRequestStore,
	accountJid: string,
): XmppState["roomInviteRequests"] {
	return store.load(accountJid);
}

export function persistInviteRequests(
	store: RoomInviteRequestStore,
	state: XmppState,
): void {
	const accountJid = state.account?.bareJid;
	if (!accountJid) return;
	store.save(accountJid, state.roomInviteRequests);
}

/** Persists whichever invite state the event can change. */
export function persistInviteState(
	roomStore: RoomInviteStore,
	requestStore: RoomInviteRequestStore,
	event: { type: string },
	state: XmppState,
): void {
	if (event.type.startsWith("room")) {
		persistRoomInvites(roomStore, state);
	}
	if (
		event.type === "room-invite-request" ||
		event.type === "room-invite-request-cleared"
	) {
		persistInviteRequests(requestStore, state);
	}
}
