import { decodeBase64, encodeBase64 } from "#/lib/omemo/base64";
import { OmemoStorageError } from "#/lib/omemo/errors";
import type { OmemoKeyPair, OmemoPersistedState } from "#/types/omemo";

interface SerializedKeyPair {
	pubKey: string;
	privKey: string;
}

interface SerializedState {
	identityKeyPair: SerializedKeyPair | null;
	registrationId: number | null;
	deviceId: number | null;
	currentSignedPreKeyId: number | null;
	preKeys: Record<string, SerializedKeyPair>;
	signedPreKeys: Record<string, SerializedKeyPair>;
	signedPreKeySignatures: Record<string, string>;
	sessions: Record<string, string>;
	identities: Record<string, string>;
	trustedIdentities: Record<string, string>;
}

function corrupt(): never {
	throw new OmemoStorageError("decryption-failed");
}

function serializeKeyPair(keyPair: OmemoKeyPair): SerializedKeyPair {
	return {
		pubKey: encodeBase64(new Uint8Array(keyPair.pubKey)),
		privKey: encodeBase64(new Uint8Array(keyPair.privKey)),
	};
}

function serializeKeyPairs(
	record: Record<string, OmemoKeyPair>,
): Record<string, SerializedKeyPair> {
	const result: Record<string, SerializedKeyPair> = {};
	for (const [keyId, keyPair] of Object.entries(record)) {
		result[keyId] = serializeKeyPair(keyPair);
	}
	return result;
}

function serializeBytesRecord(
	record: Record<string, ArrayBuffer>,
): Record<string, string> {
	const result: Record<string, string> = {};
	for (const [key, value] of Object.entries(record)) {
		result[key] = encodeBase64(new Uint8Array(value));
	}
	return result;
}

/**
 * Serializes key state to bytes for encryption.
 *
 * `ArrayBuffer` values become base64 strings because JSON cannot represent
 * binary data losslessly. Session records are already strings.
 */
export function encodeState(
	state: OmemoPersistedState,
): Uint8Array<ArrayBuffer> {
	const serialized: SerializedState = {
		identityKeyPair: state.identityKeyPair
			? serializeKeyPair(state.identityKeyPair)
			: null,
		registrationId: state.registrationId,
		deviceId: state.deviceId,
		currentSignedPreKeyId: state.currentSignedPreKeyId,
		preKeys: serializeKeyPairs(state.preKeys),
		signedPreKeys: serializeKeyPairs(state.signedPreKeys),
		signedPreKeySignatures: serializeBytesRecord(state.signedPreKeySignatures),
		sessions: { ...state.sessions },
		identities: serializeBytesRecord(state.identities),
		trustedIdentities: serializeBytesRecord(state.trustedIdentities),
	};

	return new TextEncoder().encode(JSON.stringify(serialized));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBytes(value: unknown): ArrayBuffer {
	if (typeof value !== "string") corrupt();
	const decoded = decodeBase64(value);
	if (!decoded) corrupt();
	const buffer = new ArrayBuffer(decoded.byteLength);
	new Uint8Array(buffer).set(decoded);
	return buffer;
}

function parseKeyPair(value: unknown): OmemoKeyPair {
	if (!isRecord(value)) corrupt();
	return {
		pubKey: parseBytes(value.pubKey),
		privKey: parseBytes(value.privKey),
	};
}

function parseKeyPairs(value: unknown): Record<string, OmemoKeyPair> {
	if (!isRecord(value)) corrupt();
	const result: Record<string, OmemoKeyPair> = {};
	for (const [keyId, keyPair] of Object.entries(value)) {
		result[keyId] = parseKeyPair(keyPair);
	}
	return result;
}

function parseSessions(value: unknown): Record<string, string> {
	if (!isRecord(value)) corrupt();
	const result: Record<string, string> = {};
	for (const [address, record] of Object.entries(value)) {
		if (typeof record !== "string") corrupt();
		result[address] = record;
	}
	return result;
}

function parseIdentities(value: unknown): Record<string, ArrayBuffer> {
	if (!isRecord(value)) corrupt();
	const result: Record<string, ArrayBuffer> = {};
	for (const [address, identityKey] of Object.entries(value)) {
		result[address] = parseBytes(identityKey);
	}
	return result;
}

function parseBackwardCompatibleBytesRecord(
	value: unknown,
): Record<string, ArrayBuffer> {
	if (value === undefined) return {};
	return parseIdentities(value);
}

function parseNullableInteger(value: unknown): number | null {
	if (value === undefined || value === null) return null;
	if (typeof value !== "number" || !Number.isInteger(value)) corrupt();
	return value;
}

function parseState(value: unknown): OmemoPersistedState {
	if (!isRecord(value)) corrupt();
	return {
		identityKeyPair:
			value.identityKeyPair === null
				? null
				: parseKeyPair(value.identityKeyPair),
		registrationId: parseNullableInteger(value.registrationId),
		deviceId: parseNullableInteger(value.deviceId),
		currentSignedPreKeyId: parseNullableInteger(value.currentSignedPreKeyId),
		preKeys: parseKeyPairs(value.preKeys),
		signedPreKeys: parseKeyPairs(value.signedPreKeys),
		signedPreKeySignatures: parseBackwardCompatibleBytesRecord(
			value.signedPreKeySignatures,
		),
		sessions: parseSessions(value.sessions),
		identities: parseIdentities(value.identities),
		trustedIdentities: parseBackwardCompatibleBytesRecord(
			value.trustedIdentities,
		),
	};
}

/**
 * Deserializes decrypted bytes, rejecting malformed or corrupt state with
 * `decryption-failed` so callers never receive partial key material.
 */
export function decodeState(
	bytes: Uint8Array<ArrayBuffer>,
): OmemoPersistedState {
	let parsed: unknown;
	try {
		parsed = JSON.parse(new TextDecoder().decode(bytes));
	} catch {
		corrupt();
	}
	return parseState(parsed);
}
