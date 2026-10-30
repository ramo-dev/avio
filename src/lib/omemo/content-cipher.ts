import { secureRandomBytes } from "#/lib/omemo/crypto";
import { OmemoMessageError } from "#/lib/omemo/errors";

const CONTENT_KEY_BYTES = 16;
export const CONTENT_IV_BYTES = 12;
const CONTENT_TAG_BYTES = 16;
const KEY_MATERIAL_BYTES = CONTENT_KEY_BYTES + CONTENT_TAG_BYTES;
const TAG_BITS = CONTENT_TAG_BYTES * 8;

/** AES-128-GCM ciphertext parts produced by `encryptContent`. */
export interface OmemoContentCiphertext {
	/** Key followed by tag: exactly 32 bytes that each recipient key wraps. */
	keyMaterial: Uint8Array<ArrayBuffer>;
	iv: Uint8Array<ArrayBuffer>;
	/** Ciphertext without the GCM tag. */
	payload: Uint8Array<ArrayBuffer>;
}

function requireSubtle(
	code: "encrypt-failed" | "decrypt-failed",
): SubtleCrypto {
	const subtle = globalThis.crypto?.subtle;
	if (!subtle) throw new OmemoMessageError(code);
	return subtle;
}

async function importContentKey(
	subtle: SubtleCrypto,
	key: Uint8Array<ArrayBuffer>,
	usage: KeyUsage,
): Promise<CryptoKey> {
	return subtle.importKey("raw", key, { name: "AES-GCM" }, false, [usage]);
}

/**
 * Encrypts UTF-8 plaintext with a fresh AES-128-GCM key and 12-byte IV.
 *
 * Web Crypto appends the tag to the ciphertext. OMEMO 0.3.0 keeps that tag
 * inside the encrypted per-device key material and sends only the ciphertext
 * in `<payload>`, so the two parts are split here.
 */
export async function encryptContent(
	plaintext: string,
): Promise<OmemoContentCiphertext> {
	try {
		const subtle = requireSubtle("encrypt-failed");
		const key = secureRandomBytes(CONTENT_KEY_BYTES);
		const iv = secureRandomBytes(CONTENT_IV_BYTES);
		const cryptoKey = await importContentKey(subtle, key, "encrypt");
		const sealed = new Uint8Array(
			await subtle.encrypt(
				{ name: "AES-GCM", iv, tagLength: TAG_BITS },
				cryptoKey,
				new TextEncoder().encode(plaintext),
			),
		);
		if (sealed.byteLength < CONTENT_TAG_BYTES) {
			throw new OmemoMessageError("encrypt-failed");
		}

		const split = sealed.byteLength - CONTENT_TAG_BYTES;
		const payload = sealed.slice(0, split);
		const tag = sealed.slice(split);
		const keyMaterial = new Uint8Array(KEY_MATERIAL_BYTES);
		keyMaterial.set(key, 0);
		keyMaterial.set(tag, CONTENT_KEY_BYTES);

		return { keyMaterial, iv, payload };
	} catch (error) {
		if (error instanceof OmemoMessageError) throw error;
		throw new OmemoMessageError("encrypt-failed");
	}
}

/**
 * Decrypts a payload using 32-byte key material and a 12-byte IV.
 *
 * The tag is appended back to the payload before handing both to Web Crypto.
 * Size mismatches and authentication failures both surface as
 * `decrypt-failed`, so forged envelopes never look like format errors.
 */
export async function decryptContent(
	keyMaterial: Uint8Array<ArrayBuffer>,
	iv: Uint8Array<ArrayBuffer>,
	payload: Uint8Array<ArrayBuffer>,
): Promise<string> {
	if (
		keyMaterial.byteLength !== KEY_MATERIAL_BYTES ||
		iv.byteLength !== CONTENT_IV_BYTES
	) {
		throw new OmemoMessageError("decrypt-failed");
	}

	try {
		const subtle = requireSubtle("decrypt-failed");
		const key = keyMaterial.slice(0, CONTENT_KEY_BYTES);
		const tag = keyMaterial.slice(CONTENT_KEY_BYTES);
		const sealed = new Uint8Array(payload.byteLength + CONTENT_TAG_BYTES);
		sealed.set(payload, 0);
		sealed.set(tag, payload.byteLength);
		const cryptoKey = await importContentKey(subtle, key, "decrypt");
		const plaintext = await subtle.decrypt(
			{ name: "AES-GCM", iv, tagLength: TAG_BITS },
			cryptoKey,
			sealed,
		);
		return new TextDecoder().decode(plaintext);
	} catch {
		throw new OmemoMessageError("decrypt-failed");
	}
}
