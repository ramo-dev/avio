import { decodeBase64 } from "#/lib/omemo/base64";
import { OmemoPepError, wrapOmemoPepError } from "#/lib/omemo/errors";
import { parseJid } from "#/lib/xmpp/jid";
import type {
	OmemoPepBundle,
	OmemoPepClient,
	OmemoPepPreKey,
	OmemoPepTransport,
} from "#/types/omemo";

const MAX_UINT32 = 0xffff_ffff;

function isDeviceId(value: unknown): value is number {
	return (
		typeof value === "number" &&
		Number.isInteger(value) &&
		value > 0 &&
		value <= MAX_UINT32
	);
}

function isNonEmptyBase64(value: unknown): value is string {
	if (typeof value !== "string" || value.length === 0) return false;
	const bytes = decodeBase64(value);
	return bytes !== null && bytes.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function normalizeDeviceIds(values: unknown): number[] {
	if (!Array.isArray(values)) throw new OmemoPepError("invalid-device-list");
	const seen = new Set<number>();
	const ids: number[] = [];
	for (const value of values) {
		if (!isDeviceId(value)) throw new OmemoPepError("invalid-device-list");
		if (seen.has(value)) continue;
		seen.add(value);
		ids.push(value);
	}
	return ids.sort((left, right) => left - right);
}

function readPreKey(value: unknown): OmemoPepPreKey {
	if (!isRecord(value) || !isDeviceId(value.id)) {
		throw new OmemoPepError("invalid-bundle");
	}
	if (!isNonEmptyBase64(value.publicKey)) {
		throw new OmemoPepError("invalid-bundle");
	}
	return { id: value.id, publicKey: value.publicKey };
}

function readBundle(value: unknown, expectedDeviceId?: number): OmemoPepBundle {
	if (!isRecord(value) || !isDeviceId(value.deviceId)) {
		throw new OmemoPepError("invalid-bundle");
	}
	if (expectedDeviceId !== undefined && value.deviceId !== expectedDeviceId) {
		throw new OmemoPepError("invalid-bundle");
	}
	if (
		!isDeviceId(value.signedPreKeyId) ||
		!isNonEmptyBase64(value.identityKey) ||
		!isNonEmptyBase64(value.signedPreKeyPublic) ||
		!isNonEmptyBase64(value.signedPreKeySignature) ||
		!Array.isArray(value.preKeys) ||
		value.preKeys.length === 0
	) {
		throw new OmemoPepError("invalid-bundle");
	}

	const seenPreKeyIds = new Set<number>();
	const preKeys = value.preKeys.map(readPreKey);
	for (const preKey of preKeys) {
		if (seenPreKeyIds.has(preKey.id)) {
			throw new OmemoPepError("invalid-bundle");
		}
		seenPreKeyIds.add(preKey.id);
	}

	return {
		deviceId: value.deviceId,
		identityKey: value.identityKey,
		signedPreKeyId: value.signedPreKeyId,
		signedPreKeyPublic: value.signedPreKeyPublic,
		signedPreKeySignature: value.signedPreKeySignature,
		preKeys,
	};
}

function requireAccountJid(accountJid: string): void {
	const parsed = parseJid(accountJid);
	if (!parsed?.localPart || parsed.bareJid !== accountJid) {
		throw new OmemoPepError("invalid-account");
	}
}

/**
 * Validates and normalizes legacy OMEMO PEP data before it reaches Stanza.
 *
 * Device lists are deduplicated and sorted; bundles are fully checked before
 * publication and again after fetching untrusted server data.
 */
export class OmemoPep implements OmemoPepClient {
	private readonly transport: OmemoPepTransport;

	constructor(transport: OmemoPepTransport) {
		this.transport = transport;
	}

	async publishDeviceList(deviceIds: number[]): Promise<void> {
		const normalized = normalizeDeviceIds(deviceIds);
		try {
			await this.transport.publishDeviceList(normalized);
		} catch (error) {
			throw wrapOmemoPepError("publish-failed", error);
		}
	}

	async fetchDeviceList(accountJid: string): Promise<number[] | null> {
		requireAccountJid(accountJid);
		let deviceIds: number[] | null;
		try {
			deviceIds = await this.transport.fetchDeviceList(accountJid);
		} catch (error) {
			throw wrapOmemoPepError("fetch-failed", error);
		}
		return deviceIds === null ? null : normalizeDeviceIds(deviceIds);
	}

	async publishBundle(bundle: OmemoPepBundle): Promise<void> {
		const normalized = readBundle(bundle);
		try {
			await this.transport.publishBundle(normalized);
		} catch (error) {
			throw wrapOmemoPepError("publish-failed", error);
		}
	}

	async fetchBundle(
		accountJid: string,
		deviceId: number,
	): Promise<OmemoPepBundle | null> {
		requireAccountJid(accountJid);
		if (!isDeviceId(deviceId)) throw new OmemoPepError("invalid-bundle");

		let bundle: OmemoPepBundle | null;
		try {
			bundle = await this.transport.fetchBundle(accountJid, deviceId);
		} catch (error) {
			throw wrapOmemoPepError("fetch-failed", error);
		}
		return bundle === null ? null : readBundle(bundle, deviceId);
	}

	async subscribeToDeviceList(accountJid: string): Promise<void> {
		requireAccountJid(accountJid);
		try {
			await this.transport.subscribeToDeviceList(accountJid);
		} catch (error) {
			throw wrapOmemoPepError("subscribe-failed", error);
		}
	}
}
