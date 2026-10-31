import { bareJid } from "#/lib/xmpp/jid";
import type { RoomInvite, RoomState } from "#/types/chat";
import type { PresenceState } from "#/types/xmpp";

export interface RoomMember {
	jid?: string;
	name: string;
	online: boolean;
	role?: string;
	affiliation?: string;
	presence?: PresenceState;
}

function occupiedJids(room: RoomState): Set<string> {
	const jids = new Set<string>();
	for (const occupant of Object.values(room.occupants)) {
		if (occupant.jid) jids.add(occupant.jid.toLowerCase());
	}
	return jids;
}

/**
 * Invites that have not been accepted yet and whose invitee is not currently in
 * the room. These render under Invites, never as members.
 *
 * Members-only rooms grant affiliation at invite time, so the server member list
 * can contain pending invitees. Those JIDs stay here until presence confirms the
 * join.
 */
export function selectOpenInvites(room: RoomState | undefined): RoomInvite[] {
	if (!room) return [];
	const present = occupiedJids(room);
	return Object.values(room.invites).filter(
		(invite) =>
			invite.status !== "accepted" && !present.has(invite.jid.toLowerCase()),
	);
}

/**
 * Combines live MUC occupants with accepted invite records and server member
 * JIDs.
 *
 * XMPP only sends presence for participants currently in the room. Accepted
 * invitees who are offline still belong to the room's known member set, so they
 * must not disappear from the member list when their presence is unavailable.
 * Pending invitees are excluded until they actually join.
 */
export function selectRoomMembers(room: RoomState | undefined): RoomMember[] {
	if (!room) return [];

	const members: RoomMember[] = Object.values(room.occupants).map(
		(occupant) => ({
			jid: occupant.jid,
			name: occupant.nick,
			online: true,
			role: occupant.role,
			affiliation: occupant.affiliation,
			presence: occupant.presence,
		}),
	);
	const seenJids = occupiedJids(room);
	const pendingJids = new Set(
		selectOpenInvites(room)
			.filter((invite) => invite.status === "pending")
			.map((invite) => invite.jid.toLowerCase()),
	);

	for (const invite of Object.values(room.invites)) {
		if (invite.status !== "accepted") continue;
		const key = invite.jid.toLowerCase();
		if (seenJids.has(key)) continue;
		members.push({
			jid: invite.jid,
			name: invite.name ?? invite.jid,
			online: false,
		});
		seenJids.add(key);
	}

	for (const jid of room.memberJids ?? []) {
		const key = jid.toLowerCase();
		if (seenJids.has(key) || pendingJids.has(key)) continue;
		members.push({ jid, name: jid, online: false });
		seenJids.add(key);
	}

	if (room.invitedBy) {
		const inviterJid = bareJid(room.invitedBy);
		if (!seenJids.has(inviterJid.toLowerCase())) {
			members.push({
				jid: inviterJid,
				name: inviterJid,
				online: false,
			});
		}
	}

	return members.sort((left, right) => {
		if (left.online !== right.online) return left.online ? -1 : 1;
		return left.name.localeCompare(right.name);
	});
}
