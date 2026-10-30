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
