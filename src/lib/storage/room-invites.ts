import type { RoomInvite } from "#/types/chat";
import type { RoomInviteStore } from "#/types/store";

const STORAGE_PREFIX = "avio.room-invites.v1";

export function createRoomInviteStore(): RoomInviteStore {
	return {
		load(accountJid) {
			if (typeof window === "undefined") return {};
			try {
				const raw = window.localStorage.getItem(key(accountJid));
				if (!raw) return {};
				const parsed: unknown = JSON.parse(raw);
				return isRoomInviteMap(parsed) ? parsed : {};
			} catch {
				return {};
			}
		},
		save(accountJid, rooms) {
			if (typeof window === "undefined") return;
			try {
				window.localStorage.setItem(key(accountJid), JSON.stringify(rooms));
			} catch {
				// Quota/private-browsing failures keep the in-memory state.
			}
		},
	};
}

export function createMemoryRoomInviteStore(
	initial: Record<string, RoomInvite[]> = {},
): RoomInviteStore {
	let rooms = initial;
	return {
		load: () => rooms,
		save: (_accountJid, next) => {
			rooms = next;
		},
	};
}

function key(accountJid: string): string {
	return `${STORAGE_PREFIX}:${accountJid}`;
}

function isRoomInviteMap(
	value: unknown,
): value is Record<string, RoomInvite[]> {
	if (typeof value !== "object" || value === null) return false;
	return Object.values(value).every(
		(invites) => Array.isArray(invites) && invites.every(isRoomInvite),
	);
}

function isRoomInvite(value: unknown): value is RoomInvite {
	if (typeof value !== "object" || value === null) return false;
	const invite = value as RoomInvite;
	return (
		typeof invite.jid === "string" &&
		(invite.name === undefined || typeof invite.name === "string") &&
		(invite.invitedBy === undefined || typeof invite.invitedBy === "string") &&
		(invite.status === "pending" ||
			invite.status === "accepted" ||
			invite.status === "declined") &&
		typeof invite.invitedAt === "number"
	);
}
