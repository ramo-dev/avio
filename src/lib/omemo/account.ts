import { EncryptedOmemoPersistence } from "#/lib/omemo/encrypted-persistence";
import { OmemoEngine } from "#/lib/omemo/engine";
import {
	OmemoMessageError,
	OmemoSessionError,
	OmemoStorageError,
} from "#/lib/omemo/errors";
import {
	fingerprintFromBase64,
	fingerprintIdentityKey,
} from "#/lib/omemo/fingerprint";
import { IndexedDbOmemoPersistence } from "#/lib/omemo/indexed-db-persistence";
import { OmemoMessageCipher } from "#/lib/omemo/message";
import { passphraseIssue } from "#/lib/omemo/passphrase";
import { OmemoKeyStore } from "#/lib/omemo/store";
import { bareJid } from "#/lib/xmpp/jid";
import type {
	OmemoAccountStatus,
	OmemoDecryptedMessage,
	OmemoDeviceInfo,
	OmemoEncryptedMessage,
	OmemoEnvelopePersistence,
	OmemoPepClient,
} from "#/types/omemo";

export interface OmemoAccountOptions {
	accountJid: string;
	pep: OmemoPepClient;
	raw?: OmemoEnvelopePersistence;
}

/**
 * Account-scoped OMEMO lifecycle.
 *
 * Owns the encrypted persistence wrapper and the store, engine, and cipher
 * built from it. The passphrase is handed only to the wrapper and is never
 * retained here. Locking drops every in-memory reference to key material.
 */
export class OmemoAccount {
	readonly accountJid: string;
	private readonly pep: OmemoPepClient;
	private readonly raw: OmemoEnvelopePersistence;
	private encrypted: EncryptedOmemoPersistence | null = null;
	private store: OmemoKeyStore | null = null;
	private engine: OmemoEngine | null = null;
	private cipher: OmemoMessageCipher | null = null;
	private currentDeviceId: number | null = null;
	private hasEnvelope = false;
	private currentStatus: OmemoAccountStatus = "disabled";

	constructor(options: OmemoAccountOptions) {
		this.accountJid = bareJid(options.accountJid);
		this.pep = options.pep;
		this.raw = options.raw ?? new IndexedDbOmemoPersistence();
	}

	get status(): OmemoAccountStatus {
		return this.currentStatus;
	}

	get deviceId(): number | null {
		return this.currentDeviceId;
	}

	/** Detects whether setup or unlock is required without touching keys. */
	async probe(): Promise<"setup" | "locked"> {
		try {
			const envelope = await this.raw.loadEnvelope(this.accountJid);
			this.hasEnvelope = envelope !== null;
			this.currentStatus = envelope ? "locked" : "setup";
			return this.currentStatus;
		} catch (error) {
			this.currentStatus = "error";
			throw error;
		}
	}

	/**
	 * Creates a new encrypted key store. Rejects when one already exists.
	 *
	 * Returns the non-extractable key that unlocks the store, for remembered
	 * unlock. The passphrase itself is not returned.
	 */
	async setup(passphrase: string): Promise<CryptoKey> {
		if (passphraseIssue(passphrase)) {
			throw new OmemoStorageError("weak-passphrase");
		}
		const existing = await this.raw.loadEnvelope(this.accountJid);
		if (existing) throw new OmemoStorageError("already-configured");
		return this.open(passphrase);
	}

	/** Unlocks an existing encrypted key store with its passphrase. */
	async unlock(passphrase: string): Promise<CryptoKey> {
		const existing = await this.raw.loadEnvelope(this.accountJid);
		if (!existing) throw new OmemoStorageError("not-configured");
		return this.open(passphrase);
	}

	/**
	 * Unlocks with a key previously returned by `setup` or `unlock`. A key that
	 * does not authenticate the stored key store leaves the account locked.
	 */
	async unlockWithKey(key: CryptoKey): Promise<void> {
		await this.openWithKey(key);
	}

	/** Drops the wrapper key and every store, engine, and cipher reference. */
	lock(): void {
		this.encrypted?.lock();
		this.encrypted = null;
		this.store = null;
		this.engine = null;
		this.cipher = null;
		this.currentDeviceId = null;
		this.currentStatus = this.hasEnvelope ? "locked" : "setup";
	}

	async localFingerprint(): Promise<string> {
		const identity = await this.requireStore().getIdentityKeyPair();
		if (!identity) throw new OmemoSessionError("identity-missing");
		return fingerprintIdentityKey(identity.pubKey);
	}

	/**
	 * Encrypts for every peer device plus the account's other devices.
	 *
	 * Trust is enforced by the message cipher, so an unknown device makes the
	 * whole send fail instead of silently skipping it.
	 */
	async encryptFor(to: string, text: string): Promise<OmemoEncryptedMessage> {
		const cipher = this.requireCipher();
		const localDeviceId = this.currentDeviceId;
		const target = bareJid(to);
		const [peerDevices, ownDevices] = await Promise.all([
			this.pep.fetchDeviceList(target),
			this.pep.fetchDeviceList(this.accountJid),
		]);

		const recipients = new Set<number>();
		for (const deviceId of peerDevices ?? []) recipients.add(deviceId);
		for (const deviceId of ownDevices ?? []) {
			if (deviceId !== localDeviceId) recipients.add(deviceId);
		}
		if (!peerDevices || peerDevices.length === 0) {
			throw new OmemoMessageError("no-recipients");
		}
		if (recipients.size === 0) throw new OmemoMessageError("no-recipients");

		return cipher.encryptMessage(target, text, [...recipients]);
	}

	async decrypt(
		senderJid: string,
		envelope: OmemoEncryptedMessage,
	): Promise<OmemoDecryptedMessage> {
		return this.requireCipher().decryptMessage(bareJid(senderJid), envelope);
	}

	/** Lists published devices with fingerprints and local trust state. */
	async listDevices(jid: string): Promise<OmemoDeviceInfo[]> {
		const engine = this.requireEngine();
		const target = bareJid(jid);
		const deviceIds = await this.pep.fetchDeviceList(target);
		if (!deviceIds) return [];

		const devices: OmemoDeviceInfo[] = [];
		for (const deviceId of deviceIds) {
			let bundle: Awaited<ReturnType<OmemoPepClient["fetchBundle"]>>;
			try {
				bundle = await this.pep.fetchBundle(target, deviceId);
			} catch {
				continue;
			}
			if (!bundle) continue;
			const fingerprint = await fingerprintFromBase64(bundle.identityKey);
			if (!fingerprint) continue;
			devices.push({
				deviceId,
				fingerprint,
				trusted: await engine.isTrustedDevice(target, deviceId),
			});
		}
		return devices;
	}

	async trustDevice(
		jid: string,
		deviceId: number,
		expectedFingerprint?: string,
	): Promise<void> {
		await this.requireEngine().trustDevice(
			bareJid(jid),
			deviceId,
			expectedFingerprint,
		);
	}

	/** Republishes the local device in the account's PEP device list. */
	async refreshOwnDeviceList(): Promise<void> {
		await this.requireEngine().publishDeviceList();
	}

	private async open(passphrase: string): Promise<CryptoKey> {
		this.currentStatus = "unlocking";
		const encrypted = new EncryptedOmemoPersistence(this.accountJid, this.raw);
		try {
			const key = await encrypted.unlock(passphrase);
			await this.activate(encrypted);
			return key;
		} catch (error) {
			this.fail(encrypted, error);
		}
	}

	private async openWithKey(key: CryptoKey): Promise<void> {
		this.currentStatus = "unlocking";
		const encrypted = new EncryptedOmemoPersistence(this.accountJid, this.raw);
		try {
			await encrypted.unlockWithKey(key);
			await this.activate(encrypted);
		} catch (error) {
			this.fail(encrypted, error);
		}
	}

	private async activate(encrypted: EncryptedOmemoPersistence): Promise<void> {
		const store = new OmemoKeyStore(this.accountJid, encrypted);
		const engine = new OmemoEngine({
			store,
			pep: this.pep,
			accountJid: this.accountJid,
		});
		const cipher = new OmemoMessageCipher({
			engine,
			store,
			accountJid: this.accountJid,
		});
		const initialization = await engine.initialize();

		this.encrypted = encrypted;
		this.store = store;
		this.engine = engine;
		this.cipher = cipher;
		this.currentDeviceId = initialization.deviceId;
		this.hasEnvelope = true;
		this.currentStatus = "ready";
	}

	private fail(encrypted: EncryptedOmemoPersistence, error: unknown): never {
		encrypted.lock();
		this.encrypted = null;
		this.store = null;
		this.engine = null;
		this.cipher = null;
		this.currentDeviceId = null;
		this.currentStatus = "error";
		throw error;
	}

	private requireStore(): OmemoKeyStore {
		if (!this.store) throw new OmemoStorageError("locked");
		return this.store;
	}

	private requireEngine(): OmemoEngine {
		if (!this.engine) throw new OmemoStorageError("locked");
		return this.engine;
	}

	private requireCipher(): OmemoMessageCipher {
		if (!this.cipher) throw new OmemoStorageError("locked");
		return this.cipher;
	}
}
