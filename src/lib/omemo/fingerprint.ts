import { decodeBase64 } from "#/lib/omemo/base64";
import { OmemoStorageError } from "#/lib/omemo/errors";

const GROUP_SIZE = 8;

/**
 * Formats raw digest bytes as grouped, uppercase hexadecimal.
 *
 * Groups of eight hex characters keep the value scannable when comparing
 * fingerprints out of band.
 */
export function formatFingerprint(bytes: Uint8Array): string {
	let hex = "";
	for (const byte of bytes) {
		hex += byte.toString(16).padStart(2, "0");
	}
	const groups: string[] = [];
	for (let index = 0; index < hex.length; index += GROUP_SIZE) {
		groups.push(hex.slice(index, index + GROUP_SIZE));
	}
	return groups.join(" ").toUpperCase();
}

/** Derives a deterministic SHA-256 fingerprint of an identity public key. */
export async function fingerprintIdentityKey(
	identityKey: ArrayBuffer,
): Promise<string> {
	const subtle = globalThis.crypto?.subtle;
	if (!subtle) throw new OmemoStorageError("crypto-unavailable");
	const digest = await subtle.digest("SHA-256", identityKey);
	return formatFingerprint(new Uint8Array(digest));
}

/**
 * Derives a fingerprint from a base64 identity key as published in a bundle.
 *
 * Returns `null` for malformed input so callers can skip a bad device without
 * exposing or decoding key bytes further.
 */
export async function fingerprintFromBase64(
	identityKey: string,
): Promise<string | null> {
	const bytes = decodeBase64(identityKey);
	if (!bytes || bytes.byteLength === 0) return null;
	return fingerprintIdentityKey(bytes.buffer);
}
