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
 * Session records are libomemo.js `SessionRecord` strings. Identities,
 * trusted copies, and signed-pre-key signatures are keyed by OMEMO address or
 * key ID. Device ID and the current signed pre-key ID complete the lifecycle.
 */
export interface OmemoPersistedState {
	identityKeyPair: OmemoKeyPair | null;
	registrationId: number | null;
	deviceId: number | null;
	currentSignedPreKeyId: number | null;
	preKeys: Record<string, OmemoKeyPair>;
	signedPreKeys: Record<string, OmemoKeyPair>;
	signedPreKeySignatures: Record<string, ArrayBuffer>;
	sessions: Record<string, string>;
	identities: Record<string, ArrayBuffer>;
	trustedIdentities: Record<string, ArrayBuffer>;
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

/**
 * Device-local secret that unlocks an account without typing the passphrase.
 *
 * `key` is the non-extractable AES-GCM key derived from the passphrase. The
 * passphrase itself is never stored. The discriminant leaves room for a native
 * keychain variant later.
 */
export type OmemoUnlockSecret = { type: "key"; key: CryptoKey };

/**
 * Lifecycle of an account-scoped OMEMO session.
 *
 * `setup` means no encrypted envelope exists yet, `locked` means an envelope
 * exists but the passphrase has not unlocked it in this tab.
 */
export type OmemoAccountStatus =
	| "disabled"
	| "setup"
	| "locked"
	| "unlocking"
	| "ready"
	| "error";

/** Public device facts shown in trust UI. Never contains key bytes. */
export interface OmemoDeviceInfo {
	deviceId: number;
	fingerprint: string;
	trusted: boolean;
}

/** A single legacy OMEMO pre-key published in a PEP bundle. */
export interface OmemoPepPreKey {
	id: number;
	publicKey: string;
}

/**
 * Legacy OMEMO 0.3.0 bundle as stored in a PEP node.
 *
 * Binary key material is base64 encoded so the domain type stays free of
 * Stanza buffers and works with persistence, UI, and tests alike.
 */
export interface OmemoPepBundle {
	deviceId: number;
	identityKey: string;
	signedPreKeyId: number;
	signedPreKeyPublic: string;
	signedPreKeySignature: string;
	preKeys: OmemoPepPreKey[];
}

/** One recipient device key inside an OMEMO message envelope. */
export interface OmemoCipherKey {
	rid: number;
	preKey: boolean;
	/** Base64 of the encrypted 16-byte key followed by its 16-byte GCM tag. */
	value: string;
}

/**
 * Legacy OMEMO 0.3.0 message envelope.
 *
 * `iv` and `payload` are base64. The payload is the AES-GCM ciphertext with
 * the tag stripped; the tag travels inside each per-device key value.
 */
export interface OmemoEncryptedMessage {
	sid: number;
	iv: string;
	keys: OmemoCipherKey[];
	payload: string;
}

/** Decrypted 1:1 message plus the sender and trust facts for the UI. */
export interface OmemoDecryptedMessage {
	plaintext: string;
	senderJid: string;
	senderDeviceId: number;
	trusted: boolean;
	bundleRefreshed: boolean;
}

/**
 * PEP transport bound to the connected account.
 *
 * Publishing targets the bound account; fetching accepts any account JID.
 */
export interface OmemoPepTransport {
	publishDeviceList(deviceIds: number[]): Promise<void>;
	fetchDeviceList(accountJid: string): Promise<number[] | null>;
	publishBundle(bundle: OmemoPepBundle): Promise<void>;
	fetchBundle(
		accountJid: string,
		deviceId: number,
	): Promise<OmemoPepBundle | null>;
	subscribeToDeviceList(accountJid: string): Promise<void>;
}

/**
 * Validated, normalized OMEMO PEP boundary exposed to the application.
 *
 * Publish operations always target the connected account.
 */
export interface OmemoPepClient {
	publishDeviceList(deviceIds: number[]): Promise<void>;
	fetchDeviceList(accountJid: string): Promise<number[] | null>;
	publishBundle(bundle: OmemoPepBundle): Promise<void>;
	fetchBundle(
		accountJid: string,
		deviceId: number,
	): Promise<OmemoPepBundle | null>;
	subscribeToDeviceList(accountJid: string): Promise<void>;
}
