import { Platform } from "stanza";
import type * as StanzaProtocol from "stanza/protocol";
import { decodeBase64, encodeBase64 } from "#/lib/omemo/base64";
import { OmemoMessageError } from "#/lib/omemo/errors";
import type { OmemoEncryptedMessage } from "#/types/omemo";

const MAX_DEVICE_ID = 0x7fff_ffff;

function invalidEnvelope(): never {
	throw new OmemoMessageError("invalid-envelope");
}

function isDeviceId(value: unknown): value is number {
	return (
		typeof value === "number" &&
		Number.isInteger(value) &&
		value >= 1 &&
		value <= MAX_DEVICE_ID
	);
}

/** Decodes a domain base64 field, rejecting empty or malformed input. */
function requireBase64(value: unknown): Uint8Array<ArrayBuffer> {
	if (typeof value !== "string" || value.length === 0) invalidEnvelope();
	const bytes = decodeBase64(value);
	if (!bytes || bytes.byteLength === 0) invalidEnvelope();
	return bytes;
}

/** Re-encodes a Stanza binary field after validating it is a non-empty view. */
function readBase64(value: unknown): string {
	if (!ArrayBuffer.isView(value) || value.byteLength === 0) invalidEnvelope();
	const bytes = new Uint8Array(value.byteLength);
	bytes.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
	return encodeBase64(bytes);
}

function toBuffer(bytes: Uint8Array<ArrayBuffer>) {
	return Platform.Buffer.from(bytes);
}

/**
 * Validates and maps a per-device key list in either direction.
 *
 * Duplicate recipient IDs and empty lists are rejected before any buffer is
 * allocated, matching the envelope validation used by the message cipher.
 */
function mapCipherKeys<T>(
	value: unknown,
	mapValue: (value: unknown) => T,
): { rid: number; preKey: boolean; value: T }[] {
	if (!Array.isArray(value) || value.length === 0) invalidEnvelope();

	const seen = new Set<number>();
	const keys: { rid: number; preKey: boolean; value: T }[] = [];
	for (const key of value) {
		if (!key || typeof key !== "object") invalidEnvelope();
		const { rid, preKey, value: rawValue } = key as Record<string, unknown>;
		if (!isDeviceId(rid) || seen.has(rid)) invalidEnvelope();
		seen.add(rid);
		keys.push({ rid, preKey: preKey === true, value: mapValue(rawValue) });
	}
	return keys;
}

/**
 * Maps a normalized legacy OMEMO 0.3.0 envelope to Stanza's `OMEMO`
 * extension.
 *
 * Every base64 field is validated and decoded before a Stanza buffer is
 * created. The input envelope is only read, never mutated.
 */
export function toStanzaOmemo(
	message: OmemoEncryptedMessage,
): StanzaProtocol.OMEMO {
	if (!message || typeof message !== "object") invalidEnvelope();
	if (!isDeviceId(message.sid)) invalidEnvelope();

	return {
		header: {
			sid: message.sid,
			iv: toBuffer(requireBase64(message.iv)),
			keys: mapCipherKeys(message.keys, (value) =>
				toBuffer(requireBase64(value)),
			),
		},
		payload: toBuffer(requireBase64(message.payload)),
	};
}

/**
 * Normalizes a Stanza `OMEMO` extension into the domain envelope.
 *
 * Missing headers, keys, IVs, payloads, and non-buffer binary fields all map
 * to `invalid-envelope` so callers can ignore forged stanzas without touching
 * session state.
 */
export function fromStanzaOmemo(
	omemo: StanzaProtocol.OMEMO,
): OmemoEncryptedMessage {
	if (!omemo || typeof omemo !== "object") invalidEnvelope();

	const header = omemo.header;
	if (!header || typeof header !== "object") invalidEnvelope();
	if (!isDeviceId(header.sid)) invalidEnvelope();

	return {
		sid: header.sid,
		iv: readBase64(header.iv),
		keys: mapCipherKeys(header.keys, readBase64),
		payload: readBase64(omemo.payload),
	};
}
