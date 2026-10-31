import { decodeState, encodeState } from "#/lib/omemo/codec";
import {
	deriveKey,
	openEnvelope,
	type ParsedEnvelope,
	PBKDF2_ITERATIONS,
	parseEnvelope,
	SALT_BYTES,
	sealEnvelope,
	secureRandomBytes,
} from "#/lib/omemo/crypto";
import { OmemoStorageError } from "#/lib/omemo/errors";
import type {
	OmemoEnvelopePersistence,
	OmemoPersistedState,
	OmemoPersistence,
} from "#/types/omemo";

interface UnlockedKey {
	key: CryptoKey;
	salt: Uint8Array<ArrayBuffer>;
	iterations: number;
}

/**
 * Passphrase-encrypted OMEMO persistence.
 *
 * Wraps a raw envelope store. The passphrase is used only to derive a
 * non-extractable AES-GCM key and is never retained, persisted, or logged.
 * The key and salt live in memory until `lock()` or a failed unlock.
 */
export class EncryptedOmemoPersistence implements OmemoPersistence {
	private readonly accountJid: string;
	private readonly raw: OmemoEnvelopePersistence;
	private key: CryptoKey | null = null;
	private salt: Uint8Array<ArrayBuffer> | null = null;
	private iterations: number | null = null;

	constructor(accountJid: string, raw: OmemoEnvelopePersistence) {
		this.accountJid = accountJid;
		this.raw = raw;
	}

	get isUnlocked(): boolean {
		return this.key !== null;
	}

	/**
	 * Derives the storage key and verifies an existing envelope.
	 *
	 * Returns the non-extractable derived key so callers can remember it without
	 * retaining the passphrase. A wrong passphrase fails authentication and leaves
	 * the wrapper locked.
	 */
	async unlock(passphrase: string): Promise<CryptoKey> {
		this.lock();
		if (passphrase.length === 0) {
			throw new OmemoStorageError("invalid-passphrase");
		}

		const envelope = await this.raw.loadEnvelope(this.accountJid);
		if (!envelope) {
			const salt = secureRandomBytes(SALT_BYTES);
			const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
			this.key = key;
			this.salt = salt;
			this.iterations = PBKDF2_ITERATIONS;
			return key;
		}

		const parsed = parseEnvelope(envelope);
		const key = await deriveKey(passphrase, parsed.salt, parsed.iterations);
		await this.verifyEnvelope(parsed, key);

		this.key = key;
		this.salt = parsed.salt;
		this.iterations = parsed.iterations;
		return key;
	}

	/**
	 * Unlocks with a previously derived key instead of the passphrase.
	 *
	 * The key must be non-extractable AES-GCM and must authenticate the stored
	 * envelope. Any mismatch leaves the wrapper locked.
	 */
	async unlockWithKey(key: CryptoKey): Promise<void> {
		this.lock();
		if (
			key.extractable ||
			key.algorithm.name !== "AES-GCM" ||
			!key.usages.includes("decrypt")
		) {
			throw new OmemoStorageError("invalid-passphrase");
		}

		const envelope = await this.raw.loadEnvelope(this.accountJid);
		if (!envelope) throw new OmemoStorageError("not-configured");

		const parsed = parseEnvelope(envelope);
		await this.verifyEnvelope(parsed, key);

		this.key = key;
		this.salt = parsed.salt;
		this.iterations = parsed.iterations;
	}

	private async verifyEnvelope(
		parsed: ParsedEnvelope,
		key: CryptoKey,
	): Promise<void> {
		let plaintext: Uint8Array;
		try {
			plaintext = await openEnvelope(parsed, key, this.accountJid);
		} catch (error) {
			if (
				error instanceof OmemoStorageError &&
				error.code === "decryption-failed"
			) {
				throw new OmemoStorageError("invalid-passphrase");
			}
			throw error;
		}
		plaintext.fill(0);
	}

	lock(): void {
		this.key = null;
		this.salt = null;
		this.iterations = null;
	}

	async load(accountJid: string): Promise<OmemoPersistedState | null> {
		this.assertAccount(accountJid);
		const { key } = this.requireUnlocked();

		const envelope = await this.raw.loadEnvelope(this.accountJid);
		if (!envelope) return null;

		const parsed = parseEnvelope(envelope);
		const plaintext = await openEnvelope(parsed, key, this.accountJid);
		try {
			return decodeState(plaintext);
		} finally {
			plaintext.fill(0);
		}
	}

	async save(accountJid: string, state: OmemoPersistedState): Promise<void> {
		this.assertAccount(accountJid);
		const { key, salt, iterations } = this.requireUnlocked();

		const plaintext = encodeState(state);
		try {
			const envelope = await sealEnvelope(
				plaintext,
				key,
				this.accountJid,
				salt,
				iterations,
			);
			await this.raw.saveEnvelope(this.accountJid, envelope);
		} finally {
			plaintext.fill(0);
		}
	}

	/**
	 * Clears the stored envelope even while locked. In-memory key material is
	 * dropped before the raw record is removed.
	 */
	async clear(accountJid: string): Promise<void> {
		this.assertAccount(accountJid);
		this.lock();
		await this.raw.clear(this.accountJid);
	}

	private assertAccount(accountJid: string): void {
		if (accountJid !== this.accountJid) {
			throw new OmemoStorageError("account-mismatch");
		}
	}

	private requireUnlocked(): UnlockedKey {
		if (!this.key || !this.salt || this.iterations === null) {
			throw new OmemoStorageError("locked");
		}
		return { key: this.key, salt: this.salt, iterations: this.iterations };
	}
}
