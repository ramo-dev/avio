import type { RoomInviteRequest } from "#/types/chat";
import type { RoomInviteRequestStore } from "#/types/store";

const STORAGE_PREFIX = "avio.room-invite-requests.v1";

export function createRoomInviteRequestStore(): RoomInviteRequestStore {
	return {
		load(accountJid) {
			if (typeof window === "undefined") return [];
			try {
				const raw = window.localStorage.getItem(key(accountJid));
				if (!raw) return [];
				const parsed: unknown = JSON.parse(raw);
				return isRoomInviteRequestList(parsed) ? parsed : [];
			} catch {
				return [];
			}
		},
		save(accountJid, requests) {
			if (typeof window === "undefined") return;
			try {
				window.localStorage.setItem(key(accountJid), JSON.stringify(requests));
			} catch {
				// Quota/private-browsing failures keep the in-memory state.
			}
		},
	};
}

export function createMemoryRoomInviteRequestStore(
	initial: RoomInviteRequest[] = [],
): RoomInviteRequestStore {
	let requests = initial;
	return {
		load: () => requests,
		save: (_accountJid, next) => {
			requests = next;
		},
	};
}

function key(accountJid: string): string {
	return `${STORAGE_PREFIX}:${accountJid}`;
}

function isRoomInviteRequestList(value: unknown): value is RoomInviteRequest[] {
	return Array.isArray(value) && value.every(isRoomInviteRequest);
}

function isRoomInviteRequest(value: unknown): value is RoomInviteRequest {
	if (typeof value !== "object" || value === null) return false;
	const request = value as RoomInviteRequest;
	return (
		typeof request.roomJid === "string" &&
		typeof request.roomName === "string" &&
		typeof request.from === "string" &&
		(request.reason === undefined || typeof request.reason === "string") &&
		typeof request.receivedAt === "number"
	);
}
