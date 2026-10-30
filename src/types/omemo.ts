/**
 * A Curve25519 key pair. Structurally compatible with libomemo.js `KeyPair`.
 *
 * The domain type stays independent of the crypto library so persistence and
 * UI-adjacent code never need to import libomemo.js.
 */
export interface OmemoKeyPair {
	pubKey: ArrayBuffer;
	privKey: ArrayBuffer;
}

/**
 * Everything the OMEMO key store needs to survive a reload.
 *
 * Session records are libomemo.js `SessionRecord` strings. Identities are
 * keyed by OMEMO address (`name.deviceId`), and pre-keys by their numeric ID.
 */
export interface OmemoPersistedState {
	identityKeyPair: OmemoKeyPair | null;
	registrationId: number | null;
	preKeys: Record<string, OmemoKeyPair>;
	signedPreKeys: Record<string, OmemoKeyPair>;
	sessions: Record<string, string>;
	identities: Record<string, ArrayBuffer>;
}

/**
 * Persistence boundary for OMEMO key state, scoped to a single account JID.
 */
export interface OmemoPersistence {
	load(accountJid: string): Promise<OmemoPersistedState | null>;
	save(accountJid: string, state: OmemoPersistedState): Promise<void>;
	clear(accountJid: string): Promise<void>;
}

/** Key derivation function used by the encrypted envelope format. */
export type OmemoEnvelopeKdf = "PBKDF2-HMAC-SHA-256";

/**
 * Versioned encrypted record stored at rest.
 *
 * The ciphertext is the AES-GCM-sealed serialized state. Additional
 * authenticated data binds the envelope version and account JID so a record
 * cannot be moved between accounts without failing authentication.
 */
export interface OmemoEnvelope {
	version: 1;
	kdf: OmemoEnvelopeKdf;
	iterations: number;
	salt: string;
	iv: string;
	ciphertext: string;
}

/**
 * Raw persistence boundary for encrypted envelopes. Implementations must never
 * see or store plaintext key state.
 */
export interface OmemoEnvelopePersistence {
	loadEnvelope(accountJid: string): Promise<OmemoEnvelope | null>;
	saveEnvelope(accountJid: string, envelope: OmemoEnvelope): Promise<void>;
	clear(accountJid: string): Promise<void>;
}
