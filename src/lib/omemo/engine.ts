import { KeyHelper, OMEMOAddress, SessionBuilder } from "libomemo.js";
import { decodeBase64 } from "#/lib/omemo/base64";
import {
	createLegacyBundle,
	MIN_PREKEY_COUNT,
	OMEMO_LEGACY_VERSION,
	TARGET_PREKEY_COUNT,
} from "#/lib/omemo/bundle";
import { secureRandomBytes } from "#/lib/omemo/crypto";
import { OmemoSessionError } from "#/lib/omemo/errors";
import { fingerprintIdentityKey } from "#/lib/omemo/fingerprint";
import type { OmemoKeyStore } from "#/lib/omemo/store";
import { equalBytes } from "#/lib/omemo/store-state";
import type {
	OmemoKeyPair,
	OmemoPepBundle,
	OmemoPepClient,
	OmemoPepPreKey,
} from "#/types/omemo";

export {
	MIN_PREKEY_COUNT,
	OMEMO_LEGACY_VERSION,
	TARGET_PREKEY_COUNT,
} from "#/lib/omemo/bundle";

const MAX_DEVICE_ID = 0x7fff_ffff;
const DEVICE_ID_ATTEMPTS = 32;

export interface OmemoEngineOptions {
	store: OmemoKeyStore;
	pep: OmemoPepClient;
	accountJid: string;
	deviceIdFactory?: () => number;
}

export interface OmemoInitialization {
	deviceId: number;
	registrationId: number;
	bundle: OmemoPepBundle;
}

function isValidDeviceId(value: number): boolean {
	return Number.isInteger(value) && value >= 1 && value <= MAX_DEVICE_ID;
}

function requireDeviceId(deviceId: number | undefined): number {
	if (deviceId === undefined || !isValidDeviceId(deviceId)) {
		throw new OmemoSessionError("invalid-device");
	}
	return deviceId;
}

function addressFor(accountJid: string, deviceId: number): string {
	if (!isValidDeviceId(deviceId)) {
		throw new OmemoSessionError("invalid-device");
	}
	return new OMEMOAddress(accountJid, deviceId).toString();
}

function randomDeviceId(): number {
	const bytes = secureRandomBytes(4);
	const value = new DataView(bytes.buffer).getUint32(0) & MAX_DEVICE_ID;
	return value === 0 ? 1 : value;
}

function fromBase64(value: string): ArrayBuffer {
	const bytes = decodeBase64(value);
	if (!bytes) throw new OmemoSessionError("session-failed");
	return bytes.buffer;
}

function pickPreKey(preKeys: readonly OmemoPepPreKey[]): OmemoPepPreKey {
	if (preKeys.length === 0) throw new OmemoSessionError("prekey-missing");
	const bytes = secureRandomBytes(4);
	const index = new DataView(bytes.buffer).getUint32(0) % preKeys.length;
	const preKey = preKeys[index];
	if (!preKey) throw new OmemoSessionError("prekey-missing");
	return preKey;
}

/**
 * Legacy OMEMO key lifecycle for one account.
 *
 * `initialize` creates and persists local key material, publishes a bundle,
 * and registers the device in the account's own PEP device list. Session and
 * trust helpers stay independent of message framing.
 */
export class OmemoEngine {
	private readonly store: OmemoKeyStore;
	private readonly pep: OmemoPepClient;
	private readonly accountJid: string;
	private readonly deviceIdFactory: () => number;

	constructor(options: OmemoEngineOptions) {
		this.store = options.store;
		this.pep = options.pep;
		this.accountJid = options.accountJid;
		this.deviceIdFactory = options.deviceIdFactory ?? randomDeviceId;
	}

	async initialize(): Promise<OmemoInitialization> {
		await this.store.load();
		const identity = await this.ensureIdentity();
		const registrationId = await this.ensureRegistrationId();
		const deviceId = await this.ensureDeviceId();
		await this.ensureSignedPreKey(identity);
		await this.ensurePreKeys();
		const bundle = await this.createBundle();
		await this.pep.publishBundle(bundle);
		await this.publishDeviceList();
		return { deviceId, registrationId, bundle };
	}

	async publishBundle(): Promise<void> {
		await this.pep.publishBundle(await this.createBundle());
	}

	/** Tops pre-keys back up after a consumed pre-key drops the pool below 20. */
	async replenishPreKeys(): Promise<void> {
		await this.ensurePreKeys();
	}

	async publishDeviceList(): Promise<void> {
		const deviceId = requireDeviceId(await this.store.getDeviceId());
		const existing = await this.pep.fetchDeviceList(this.accountJid);
		const deviceIds = existing ? [...existing, deviceId] : [deviceId];
		await this.pep.publishDeviceList(deviceIds);
	}

	async createBundle(): Promise<OmemoPepBundle> {
		return createLegacyBundle(this.store);
	}

	async buildSession(accountJid: string, deviceId: number): Promise<void> {
		const address = addressFor(accountJid, deviceId);
		const bundle = await this.pep.fetchBundle(accountJid, deviceId);
		if (!bundle) throw new OmemoSessionError("bundle-missing");
		const bundleIdentity = fromBase64(bundle.identityKey);
		const knownIdentity = await this.store.loadIdentityKey(address);
		if (knownIdentity && !equalBytes(knownIdentity, bundleIdentity)) {
			await this.store.removeTrustedIdentity(address);
			throw new OmemoSessionError("identity-changed");
		}
		const preKey = pickPreKey(bundle.preKeys);

		try {
			await new SessionBuilder(
				this.store,
				new OMEMOAddress(accountJid, deviceId),
				OMEMO_LEGACY_VERSION,
			).processPreKey({
				identityKey: bundleIdentity,
				signedPreKey: {
					publicKey: fromBase64(bundle.signedPreKeyPublic),
					signature: fromBase64(bundle.signedPreKeySignature),
					keyId: bundle.signedPreKeyId,
				},
				preKey: {
					keyId: preKey.id,
					publicKey: fromBase64(preKey.publicKey),
				},
				registrationId: 0,
			});
		} catch {
			throw new OmemoSessionError("session-failed");
		}

		if ((await this.store.loadSession(address)) === undefined) {
			throw new OmemoSessionError("session-failed");
		}
	}

	async ensureSession(accountJid: string, deviceId: number): Promise<void> {
		const address = addressFor(accountJid, deviceId);
		if ((await this.store.loadSession(address)) !== undefined) return;
		await this.buildSession(accountJid, deviceId);
	}

	async trustDevice(
		accountJid: string,
		deviceId: number,
		expectedFingerprint?: string,
	): Promise<void> {
		const address = addressFor(accountJid, deviceId);
		const bundle = await this.pep.fetchBundle(accountJid, deviceId);
		if (!bundle) throw new OmemoSessionError("bundle-missing");
		const identity = fromBase64(bundle.identityKey);
		if (expectedFingerprint) {
			const actual = await fingerprintIdentityKey(identity);
			if (actual !== expectedFingerprint) {
				throw new OmemoSessionError("identity-changed");
			}
		}
		const known = await this.store.loadIdentityKey(address);
		if (known && !equalBytes(known, identity)) {
			await this.store.removeSession(address);
		}
		await this.store.saveIdentity(address, identity);
		await this.store.saveTrustedIdentity(address, identity);
	}

	async isTrustedDevice(
		accountJid: string,
		deviceId: number,
	): Promise<boolean> {
		const address = addressFor(accountJid, deviceId);
		const current = await this.store.loadIdentityKey(address);
		const trusted = await this.store.loadTrustedIdentity(address);
		if (!current || !trusted) return false;
		return equalBytes(current, trusted);
	}

	async requireTrustedDevice(
		accountJid: string,
		deviceId: number,
	): Promise<void> {
		if (!(await this.isTrustedDevice(accountJid, deviceId))) {
			throw new OmemoSessionError("untrusted-device");
		}
	}

	private async ensureIdentity(): Promise<OmemoKeyPair> {
		const existing = await this.store.getIdentityKeyPair();
		if (existing) return existing;
		const identity = await KeyHelper.generateIdentityKeyPair();
		await this.store.saveIdentityKeyPair(identity);
		return identity;
	}

	private async ensureRegistrationId(): Promise<number> {
		const existing = await this.store.getLocalRegistrationId();
		if (existing !== undefined) return existing;
		const registrationId = KeyHelper.generateRegistrationId();
		await this.store.saveLocalRegistrationId(registrationId);
		return registrationId;
	}

	private async ensureDeviceId(): Promise<number> {
		const existing = await this.store.getDeviceId();
		if (existing !== undefined) return requireDeviceId(existing);
		const ownDevices = await this.pep.fetchDeviceList(this.accountJid);
		const deviceId = this.nextDeviceId(new Set(ownDevices ?? []));
		await this.store.saveDeviceId(deviceId);
		return deviceId;
	}

	private nextDeviceId(existing: ReadonlySet<number>): number {
		for (let attempt = 0; attempt < DEVICE_ID_ATTEMPTS; attempt += 1) {
			const candidate = this.deviceIdFactory();
			if (isValidDeviceId(candidate) && !existing.has(candidate)) {
				return candidate;
			}
		}
		throw new OmemoSessionError("invalid-device");
	}

	private async ensureSignedPreKey(identity: OmemoKeyPair): Promise<void> {
		const currentId = await this.store.getCurrentSignedPreKeyId();
		if (currentId !== undefined) {
			const keyPair = await this.store.loadSignedPreKey(currentId);
			const signature = await this.store.loadSignedPreKeySignature(currentId);
			if (keyPair && signature) return;
		}

		const keyId = currentId ?? 1;
		const signedPreKey = await KeyHelper.generateSignedPreKey(
			identity,
			keyId,
			OMEMO_LEGACY_VERSION,
		);
		await this.store.storeSignedPreKey(keyId, signedPreKey.keyPair);
		await this.store.saveSignedPreKeySignature(keyId, signedPreKey.signature);
		await this.store.saveCurrentSignedPreKeyId(keyId);
	}

	private async ensurePreKeys(): Promise<void> {
		const ids = await this.store.listPreKeyIds();
		if (ids.length >= MIN_PREKEY_COUNT) return;

		const missing = TARGET_PREKEY_COUNT - ids.length;
		let nextId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
		for (let index = 0; index < missing; index += 1) {
			const preKey = await KeyHelper.generatePreKey(nextId);
			await this.store.storePreKey(nextId, preKey.keyPair);
			nextId += 1;
		}
	}
}
