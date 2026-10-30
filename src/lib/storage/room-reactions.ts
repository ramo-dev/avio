/**
 * Tab-scoped snapshot of room reaction maps.
 *
 * Prosody's MUC history and `mod_muc_mam` do not replay body-less reaction
 * stanzas, so a room rejoin would otherwise drop reactions received while the
 * tab was connected. This snapshot keeps the last known reaction map per room
 * and message in `sessionStorage`, so a refresh can restore reactions. It dies
 * with the tab, and newer server-delivered reactions always win.
 */
import type { RoomReactionSnapshot, RoomReactionStore } from "#/types/storage";

const STORAGE_KEY = "avio.room.reactions.v1";
const MAX_ROOMS = 50;

function parseSnapshot(raw: string | null): RoomReactionSnapshot {
	if (!raw) return {};
	try {
		const parsed: unknown = JSON.parse(raw);
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			Array.isArray(parsed)
		) {
			return {};
		}
		const snapshot: RoomReactionSnapshot = {};
		for (const [roomJid, entries] of Object.entries(parsed)) {
			snapshot[roomJid] = parseRoomEntry(entries);
		}
		return pruneEmptyRooms(snapshot);
	} catch {
		return {};
	}
}

function parseRoomEntry(entries: unknown) {
	const messageEntries: RoomReactionSnapshot[string] = {};
	if (
		typeof entries !== "object" ||
		entries === null ||
		Array.isArray(entries)
	) {
		return messageEntries;
	}
	for (const [messageId, senders] of Object.entries(entries)) {
		const senderEntries = parseSenderEntry(senders);
		if (Object.keys(senderEntries).length > 0) {
			messageEntries[messageId] = senderEntries;
		}
	}
	return messageEntries;
}

function parseSenderEntry(senders: unknown) {
	const senderEntries: { [senderJid: string]: string[] } = {};
	if (
		typeof senders !== "object" ||
		senders === null ||
		Array.isArray(senders)
	) {
		return senderEntries;
	}
	for (const [senderJid, reactions] of Object.entries(senders)) {
		if (
			Array.isArray(reactions) &&
			reactions.every((reaction) => typeof reaction === "string")
		) {
			senderEntries[senderJid] = reactions;
		}
	}
	return senderEntries;
}

function pruneEmptyRooms(snapshot: RoomReactionSnapshot): RoomReactionSnapshot {
	for (const [roomJid, entries] of Object.entries(snapshot)) {
		if (Object.keys(entries).length === 0) delete snapshot[roomJid];
	}
	return snapshot;
}

function createStorage(adapter: () => Storage | null): RoomReactionStore {
	return {
		load() {
			try {
				return parseSnapshot(adapter()?.getItem(STORAGE_KEY) ?? null);
			} catch {
				return {};
			}
		},
		save(snapshot) {
			try {
				// Ring-buffer rooms so a broadly used tab cannot grow unbounded.
				const rooms = Object.keys(snapshot).slice(-MAX_ROOMS);
				if (rooms.length === 0) {
					adapter()?.removeItem(STORAGE_KEY);
					return;
				}
				const trimmed: RoomReactionSnapshot = {};
				for (const roomJid of rooms) trimmed[roomJid] = snapshot[roomJid];
				adapter()?.setItem(STORAGE_KEY, JSON.stringify(trimmed));
			} catch {
				// Storage can be full or disabled. The snapshot is best-effort.
			}
		},
	};
}

export function createRoomReactionStore(): RoomReactionStore {
	if (typeof window === "undefined") return createMemoryRoomReactionStore();
	return createStorage(() => window.sessionStorage);
}

/** In-memory snapshot store for tests. */
export function createMemoryRoomReactionStore(): RoomReactionStore {
	let snapshot: RoomReactionSnapshot = {};
	return {
		load: () => snapshot,
		save(next) {
			snapshot = next;
		},
	};
}
