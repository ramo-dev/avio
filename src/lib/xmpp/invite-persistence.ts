import type {
	RoomInviteRequestStore,
	RoomInviteStore,
	XmppState,
} from "#/types/store";

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
