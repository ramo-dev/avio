import type { OmemoUnlockSecret } from "#/types/omemo";

export interface StoredSession {
	jid: string;
	websocketUrl?: string;
	boshUrl?: string;
	resource?: string;
}

export interface OmemoUnlockStore {
	load(accountJid: string): Promise<OmemoUnlockSecret | null>;
	save(accountJid: string, secret: OmemoUnlockSecret): Promise<void>;
	clear(accountJid: string): Promise<void>;
	/** Removes passphrase copies written by earlier builds. */
	clearLegacyPassphrases(): void;
}

/**
 * Tab-scoped snapshot of room reaction maps (see `room-reactions.ts`).
 */
export interface RoomReactionSnapshotEntry {
	[messageId: string]: { [senderJid: string]: string[] };
}

export interface RoomReactionSnapshot {
	[roomJid: string]: RoomReactionSnapshotEntry;
}

export interface RoomReactionStore {
	load(): RoomReactionSnapshot;
	save(snapshot: RoomReactionSnapshot): void;
}
