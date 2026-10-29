import { createConversation } from "#/lib/xmpp/conversation-state";
import type { RoomState } from "#/types/chat";
import type { XmppEvent, XmppState } from "#/types/store";

export function reduceRoom(state: XmppState, room: RoomState): XmppState {
	const existing =
		state.conversations[room.jid] ??
		createConversation(room.jid, "group", room.name);

	return {
		...state,
		rooms: { ...state.rooms, [room.jid]: room },
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
		if (invite.jid.toLowerCase() !== joinedJid) continue;
		invites[jid] = { ...invite, status: "accepted" };
	}
	return invites;
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
