import { decodeBase64, encodeBase64 } from "#/lib/omemo/base64";
import { OmemoStorageError } from "#/lib/omemo/errors";
import type { OmemoEnvelope, OmemoEnvelopeKdf } from "#/types/omemo";

export const ENVELOPE_VERSION = 1;
export const ENVELOPE_KDF: OmemoEnvelopeKdf = "PBKDF2-HMAC-SHA-256";
export const PBKDF2_ITERATIONS = 600_000;
export const SALT_BYTES = 16;
export const MIN_PBKDF2_ITERATIONS = 100_000;
export const MAX_PBKDF2_ITERATIONS = 2_000_000;

const IV_BYTES = 12;
const KEY_BITS = 256;

/**
 * Structural envelope fields after base64 decoding and validation.
 */
export interface ParsedEnvelope {
	version: OmemoEnvelope["version"];
	iterations: number;
	salt: Uint8Array<ArrayBuffer>;
	iv: Uint8Array<ArrayBuffer>;
	ciphertext: Uint8Array<ArrayBuffer>;
}

function requireSubtle(): SubtleCrypto {
	const subtle = globalThis.crypto?.subtle;
	if (!subtle) throw new OmemoStorageError("crypto-unavailable");
	return subtle;
}

export function secureRandomBytes(length: number): Uint8Array<ArrayBuffer> {
	const crypto = globalThis.crypto;
	if (!crypto?.getRandomValues) {
		throw new OmemoStorageError("crypto-unavailable");
	}
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return bytes;
}

/**
 * Additional authenticated data ties an envelope to its version and account so
 * records cannot be replayed under another account.
 */
function envelopeAad(
	accountJid: string,
	version: number,
	iterations: number,
	salt: Uint8Array<ArrayBuffer>,
): Uint8Array<ArrayBuffer> {
	return new TextEncoder().encode(
		JSON.stringify({
			purpose: "avio-omemo-envelope",
			version,
			accountJid,
			kdf: ENVELOPE_KDF,
			iterations,
			salt: encodeBase64(salt),
		}),
	);
}

/**
 * Validates an envelope and decodes its binary fields.
 *
 * Version and KDF failures are `unsupported-envelope`. Malformed ciphertext is
 * `decryption-failed` so corruption never looks like a format mismatch.
 */
export function parseEnvelope(envelope: OmemoEnvelope): ParsedEnvelope {
	if (envelope.version !== ENVELOPE_VERSION) {
		throw new OmemoStorageError("unsupported-envelope");
	}
	if (envelope.kdf !== ENVELOPE_KDF) {
		throw new OmemoStorageError("unsupported-envelope");
	}
	if (
		!Number.isInteger(envelope.iterations) ||
		envelope.iterations < MIN_PBKDF2_ITERATIONS ||
		envelope.iterations > MAX_PBKDF2_ITERATIONS
	) {
		throw new OmemoStorageError("unsupported-envelope");
	}

	const salt = decodeBase64(envelope.salt);
	if (!salt || salt.byteLength !== SALT_BYTES) {
		throw new OmemoStorageError("unsupported-envelope");
	}
	const iv = decodeBase64(envelope.iv);
	if (!iv || iv.byteLength !== IV_BYTES) {
		throw new OmemoStorageError("unsupported-envelope");
	}
	const ciphertext = decodeBase64(envelope.ciphertext);
	if (!ciphertext) throw new OmemoStorageError("decryption-failed");

	return {
		version: envelope.version,
		iterations: envelope.iterations,
		salt,
		iv,
		ciphertext,
	};
}

/**
 * Derives a non-extractable AES-GCM key with PBKDF2-HMAC-SHA-256.
 */
export async function deriveKey(
	passphrase: string,
	salt: Uint8Array<ArrayBuffer>,
	iterations: number,
): Promise<CryptoKey> {
	const subtle = requireSubtle();
	const material = await subtle.importKey(
		"raw",
		new TextEncoder().encode(passphrase),
		"PBKDF2",
		false,
		["deriveKey"],
	);

	return subtle.deriveKey(
		{ name: "PBKDF2", hash: "SHA-256", salt, iterations },
		material,
		{ name: "AES-GCM", length: KEY_BITS },
		false,
		["encrypt", "decrypt"],
	);
}

/**
 * Encrypts plaintext with AES-GCM 256 and a fresh 12-byte IV.
 */
export async function sealEnvelope(
	plaintext: Uint8Array<ArrayBuffer>,
	key: CryptoKey,
	accountJid: string,
	salt: Uint8Array<ArrayBuffer>,
	iterations: number,
): Promise<OmemoEnvelope> {
	const subtle = requireSubtle();
	const iv = secureRandomBytes(IV_BYTES);
	const ciphertext = await subtle.encrypt(
		{
			name: "AES-GCM",
			iv,
			additionalData: envelopeAad(
				accountJid,
				ENVELOPE_VERSION,
				iterations,
				salt,
			),
			tagLength: 128,
		},
		key,
		plaintext,
	);

	return {
		version: ENVELOPE_VERSION,
		kdf: ENVELOPE_KDF,
		iterations,
		salt: encodeBase64(salt),
		iv: encodeBase64(iv),
		ciphertext: encodeBase64(new Uint8Array(ciphertext)),
	};
}

/**
 * Opens a parsed envelope. Authentication failures (including a wrong key) are
 * normalized to `decryption-failed`.
 */
export async function openEnvelope(
	envelope: ParsedEnvelope,
	key: CryptoKey,
	accountJid: string,
): Promise<Uint8Array<ArrayBuffer>> {
	const subtle = requireSubtle();
	try {
		const plaintext = await subtle.decrypt(
			{
				name: "AES-GCM",
				iv: envelope.iv,
				additionalData: envelopeAad(
					accountJid,
					envelope.version,
					envelope.iterations,
					envelope.salt,
				),
				tagLength: 128,
			},
			key,
			envelope.ciphertext,
		);
		return new Uint8Array(plaintext);
	} catch {
		throw new OmemoStorageError("decryption-failed");
	}
}
