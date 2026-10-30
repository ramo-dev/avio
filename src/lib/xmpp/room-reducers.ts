import { createConversation } from "#/lib/xmpp/conversation-state";
import type { RoomState } from "#/types/chat";
import type { XmppEvent, XmppState } from "#/types/store";

export function reduceRoom(state: XmppState, room: RoomState): XmppState {
	const existing =
		state.conversations[room.jid] ??
		createConversation(room.jid, "group", room.name);
	const previous = state.rooms[room.jid];
	const occupants =
		previous && Object.keys(room.occupants).length === 0
			? previous.occupants
			: room.occupants;
	const invites =
		previous && Object.keys(room.invites).length === 0
			? previous.invites
			: room.invites;
	const mergedRoom: RoomState = {
		...room,
		occupants,
		invites,
		membership: room.membership ?? previous?.membership,
	};

	return {
		...state,
		contacts: withoutRoomContact(state.contacts, room.jid),
		rooms: { ...state.rooms, [room.jid]: mergedRoom },
		conversations: {
			...state.conversations,
			[room.jid]: {
				...existing,
				kind: "group",
				title: room.name,
				nick: room.nick,
			},
		},
	};
}

function withoutRoomContact(
	contacts: XmppState["contacts"],
	roomJid: string,
): XmppState["contacts"] {
	if (!Object.hasOwn(contacts, roomJid)) return contacts;
	const next = { ...contacts };
	delete next[roomJid];
	return next;
}

export function reduceRoomMembership(
	state: XmppState,
	event: Extract<XmppEvent, { type: "room-membership" }>,
): XmppState {
	const room = state.rooms[event.jid];
	if (!room) return state;
	return {
		...state,
		rooms: {
			...state.rooms,
			[event.jid]: { ...room, membership: event.membership },
		},
	};
}

export function reduceRoomOccupant(
	state: XmppState,
	event: Extract<XmppEvent, { type: "room-occupant" }>,
): XmppState {
	const room = state.rooms[event.jid];
	if (!room) return state;

	const occupants = { ...room.occupants };
	if (event.action === "leave") delete occupants[event.occupant.nick];
	else occupants[event.occupant.nick] = event.occupant;

	const invites = markAccepted(room, event);

	return {
		...state,
		rooms: {
			...state.rooms,
			[event.jid]: { ...room, occupants, invites },
		},
	};
}

function markAccepted(
	room: RoomState,
	event: Extract<XmppEvent, { type: "room-occupant" }>,
) {
	const invites = { ...room.invites };
	const joinedJid = event.occupant.jid?.toLowerCase();
	if (event.action === "leave" || !joinedJid) return invites;

	for (const [jid, invite] of Object.entries(invites)) {
		const jidMatches = invite.jid.toLowerCase() === joinedJid;
		const nickMatches =
			invite.jid.split("@")[0]?.toLowerCase() ===
			event.occupant.nick.toLowerCase();
		if (!jidMatches && !nickMatches) continue;
		invites[jid] = { ...invite, status: "accepted" };
	}
	return invites;
}

export function reduceRoomMembers(
	state: XmppState,
	event: Extract<XmppEvent, { type: "room-members" }>,
): XmppState {
	const room = state.rooms[event.jid];
	if (!room) return state;
	return {
		...state,
		rooms: {
			...state.rooms,
			[event.jid]: { ...room, memberJids: event.memberJids },
		},
	};
}

export function reduceRoomInviteDeclined(
	state: XmppState,
	event: Extract<XmppEvent, { type: "room-invite-declined" }>,
): XmppState {
	const room = state.rooms[event.roomJid];
	if (!room) return state;

	const invite = room.invites[event.from];
	if (!invite) return state;
	return {
		...state,
		rooms: {
			...state.rooms,
			[event.roomJid]: {
				...room,
				memberJids: room.memberJids?.filter(
					(jid) => jid.toLowerCase() !== event.from.toLowerCase(),
				),
				invites: {
					...room.invites,
					[event.from]: { ...invite, status: "declined" },
				},
			},
		},
	};
}

export function reduceRoomInvites(
	state: XmppState,
	event: Extract<XmppEvent, { type: "room-invites" }>,
): XmppState {
	const room = state.rooms[event.jid];
	if (!room) return state;

	const invites = { ...room.invites };
	for (const invite of event.invites) {
		invites[invite.jid] = invite;
	}

	return {
		...state,
		rooms: { ...state.rooms, [event.jid]: { ...room, invites } },
	};
}

export function reduceRoomSubject(
	state: XmppState,
	event: Extract<XmppEvent, { type: "room-subject" }>,
): XmppState {
	const room = state.rooms[event.jid];
	if (!room) return state;

	return {
		...state,
		rooms: {
			...state.rooms,
			[event.jid]: { ...room, subject: event.subject },
		},
	};
}

export function reduceRoomLeft(
	state: XmppState,
	event: Extract<XmppEvent, { type: "room-left" }>,
): XmppState {
	const rooms = { ...state.rooms };
	const conversations = { ...state.conversations };
	delete rooms[event.jid];
	delete conversations[event.jid];

	return {
		...state,
		rooms,
		conversations,
		activeJid: state.activeJid === event.jid ? null : state.activeJid,
	};
}
