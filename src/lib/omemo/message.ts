import { OMEMOAddress, SessionCipher } from "libomemo.js";
import { decodeBase64, encodeBase64 } from "#/lib/omemo/base64";
import { OMEMO_LEGACY_VERSION } from "#/lib/omemo/bundle";
import {
	CONTENT_IV_BYTES,
	decryptContent,
	encryptContent,
} from "#/lib/omemo/content-cipher";
import type { OmemoEngine } from "#/lib/omemo/engine";
import {
	OmemoMessageError,
	OmemoSessionError,
	OmemoStorageError,
} from "#/lib/omemo/errors";
import type { OmemoKeyStore } from "#/lib/omemo/store";
import type {
	OmemoCipherKey,
	OmemoDecryptedMessage,
	OmemoEncryptedMessage,
} from "#/types/omemo";

const MAX_DEVICE_ID = 0x7fff_ffff;

export interface OmemoMessageCipherOptions {
	engine: OmemoEngine;
	store: OmemoKeyStore;
	accountJid: string;
}

interface ParsedCipherKey {
	rid: number;
	preKey: boolean;
	value: Uint8Array<ArrayBuffer>;
}

interface ParsedEnvelope {
	iv: Uint8Array<ArrayBuffer>;
	payload: Uint8Array<ArrayBuffer>;
	keys: Map<number, ParsedCipherKey>;
}

function isValidDeviceId(value: number): boolean {
	return Number.isInteger(value) && value >= 1 && value <= MAX_DEVICE_ID;
}

function invalidEnvelope(): never {
	throw new OmemoMessageError("invalid-envelope");
}

function toBase64(bytes: Uint8Array<ArrayBuffer>): string {
	return encodeBase64(bytes);
}

/**
 * libomemo.js returns raw ratchet messages as binary strings. Each code unit
 * is one byte, so masking to 8 bits preserves the wire bytes.
 */
function binaryStringToBytes(value: string): Uint8Array<ArrayBuffer> {
	const bytes = new Uint8Array(value.length);
	for (let index = 0; index < value.length; index += 1) {
		bytes[index] = value.charCodeAt(index) & 0xff;
	}
	return bytes;
}

function isIdentityChange(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	return (
		error.message.includes("Identity key changed") ||
		error.message.includes("Unknown identity key")
	);
}

function toMessageError(
	error: unknown,
	fallback: "encrypt-failed" | "decrypt-failed",
): Error {
	if (
		error instanceof OmemoMessageError ||
		error instanceof OmemoSessionError ||
		error instanceof OmemoStorageError
	) {
		return error;
	}
	return new OmemoMessageError(fallback);
}

function normalizeRecipients(deviceIds: number[]): number[] {
	const unique = new Set<number>();
	for (const deviceId of deviceIds) {
		if (!isValidDeviceId(deviceId)) {
			throw new OmemoMessageError("encrypt-failed");
		}
		unique.add(deviceId);
	}
	if (unique.size === 0) throw new OmemoMessageError("no-recipients");
	return [...unique].sort((left, right) => left - right);
}

/**
 * Validates every field a forged envelope could abuse before any session
 * state is touched. Binary sizes, device IDs, and duplicate keys are all
 * checked up front so decryption never runs on a malformed message.
 */
function parseEnvelope(envelope: OmemoEncryptedMessage): ParsedEnvelope {
	if (!envelope || typeof envelope !== "object") invalidEnvelope();
	if (!isValidDeviceId(envelope.sid) || !Array.isArray(envelope.keys)) {
		invalidEnvelope();
	}

	const keys = new Map<number, ParsedCipherKey>();
	for (const key of envelope.keys) {
		if (!key || !isValidDeviceId(key.rid) || keys.has(key.rid)) {
			invalidEnvelope();
		}
		if (typeof key.value !== "string" || key.value.length === 0) {
			invalidEnvelope();
		}
		const value = decodeBase64(key.value);
		if (!value || value.byteLength === 0) invalidEnvelope();
		keys.set(key.rid, {
			rid: key.rid,
			preKey: key.preKey === true,
			value,
		});
	}

	const iv = decodeBase64(envelope.iv);
	if (!iv || iv.byteLength !== CONTENT_IV_BYTES) invalidEnvelope();
	if (typeof envelope.payload !== "string") invalidEnvelope();
	const payload = decodeBase64(envelope.payload);
	if (!payload) invalidEnvelope();

	return { iv, payload, keys };
}

/**
 * Legacy OMEMO 0.3.0 message codec for one account.
 *
 * One AES-128-GCM content key encrypts the plaintext; its key and tag are then
 * wrapped once per recipient device through the Double Ratchet. Sending and
 * receiving decisions stay here so stanza and UI layers only see domain types.
 */
export class OmemoMessageCipher {
	readonly accountJid: string;
	private readonly engine: OmemoEngine;
	private readonly store: OmemoKeyStore;

	constructor(options: OmemoMessageCipherOptions) {
		this.accountJid = options.accountJid;
		this.engine = options.engine;
		this.store = options.store;
	}

	async encryptMessage(
		to: string,
		plaintext: string,
		deviceIds: number[],
	): Promise<OmemoEncryptedMessage> {
		try {
			const localDeviceId = await this.localDeviceId();
			const recipients = normalizeRecipients(deviceIds);

			for (const deviceId of recipients) {
				await this.engine.requireTrustedDevice(to, deviceId);
				await this.engine.ensureSession(to, deviceId);
			}

			const content = await encryptContent(plaintext);
			const keys: OmemoCipherKey[] = [];
			for (const deviceId of recipients) {
				const result = await this.sessionCipher(to, deviceId).encrypt(
					content.keyMaterial,
				);
				keys.push({
					rid: deviceId,
					preKey: result.type === 3,
					value: toBase64(binaryStringToBytes(result.body)),
				});
			}

			return {
				sid: localDeviceId,
				iv: toBase64(content.iv),
				keys,
				payload: toBase64(content.payload),
			};
		} catch (error) {
			throw toMessageError(error, "encrypt-failed");
		}
	}

	async decryptMessage(
		senderJid: string,
		envelope: OmemoEncryptedMessage,
	): Promise<OmemoDecryptedMessage> {
		const parsed = parseEnvelope(envelope);
		const localDeviceId = await this.localDeviceId();
		const key = parsed.keys.get(localDeviceId);
		if (!key) throw new OmemoMessageError("no-device-key");

		let keyMaterial: Uint8Array<ArrayBuffer>;
		try {
			const cipher = this.sessionCipher(senderJid, envelope.sid);
			const result = key.preKey
				? await cipher.decryptPreKeyWhisperMessage(key.value, "binary")
				: await cipher.decryptWhisperMessage(key.value, "binary");
			keyMaterial = new Uint8Array(result.plaintext);
		} catch (error) {
			if (isIdentityChange(error)) {
				await this.store.removeTrustedIdentity(`${senderJid}.${envelope.sid}`);
				throw new OmemoMessageError("identity-changed");
			}
			throw toMessageError(error, "decrypt-failed");
		}

		const plaintext = await decryptContent(
			keyMaterial,
			parsed.iv,
			parsed.payload,
		);
		const trusted = await this.engine.isTrustedDevice(senderJid, envelope.sid);
		const bundleRefreshed = key.preKey ? await this.refreshBundle() : false;

		return {
			plaintext,
			senderJid,
			senderDeviceId: envelope.sid,
			trusted,
			bundleRefreshed,
		};
	}

	private async localDeviceId(): Promise<number> {
		const deviceId = await this.store.getDeviceId();
		if (deviceId === undefined || !isValidDeviceId(deviceId)) {
			throw new OmemoMessageError("not-initialized");
		}
		return deviceId;
	}

	private sessionCipher(jid: string, deviceId: number): SessionCipher {
		return new SessionCipher(
			this.store,
			new OMEMOAddress(jid, deviceId),
			OMEMO_LEGACY_VERSION,
		);
	}

	/**
	 * A consumed pre-key leaves the local bundle stale. Republishing is
	 * best-effort: the message is already authentic, so a fetch or publish
	 * failure must not discard it.
	 */
	private async refreshBundle(): Promise<boolean> {
		try {
			await this.engine.replenishPreKeys();
			await this.engine.publishBundle();
			return true;
		} catch {
			return false;
		}
	}
}
