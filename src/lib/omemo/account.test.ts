// @vitest-environment node

import { describe, expect, it } from "vitest";
import { OmemoAccount } from "#/lib/omemo/account";
import { MemoryOmemoEnvelopePersistence } from "#/lib/omemo/memory-persistence";
import type { OmemoPepBundle, OmemoPepClient } from "#/types/omemo";

const ALICE = "alice@example.com";
const BOB = "bob@example.com";
const PASSPHRASE = "correct horse battery staple";
const WRONG_PASSPHRASE = "incorrect horse battery staple";

class PepServer {
	private readonly deviceLists = new Map<string, number[]>();
	private readonly bundles = new Map<string, Map<number, OmemoPepBundle>>();

	publishDeviceList(accountJid: string, deviceIds: number[]): void {
		this.deviceLists.set(
			accountJid,
			[...deviceIds].sort((left, right) => left - right),
		);
	}

	getDeviceList(accountJid: string): number[] | null {
		const deviceIds = this.deviceLists.get(accountJid);
		return deviceIds ? [...deviceIds] : null;
	}

	publishBundle(accountJid: string, bundle: OmemoPepBundle): void {
		const bundles = this.bundles.get(accountJid) ?? new Map();
		bundles.set(bundle.deviceId, structuredClone(bundle));
		this.bundles.set(accountJid, bundles);
	}

	getBundle(accountJid: string, deviceId: number): OmemoPepBundle | null {
		const bundle = this.bundles.get(accountJid)?.get(deviceId);
		return bundle ? structuredClone(bundle) : null;
	}
}

class TestPepClient implements OmemoPepClient {
	constructor(
		private readonly server: PepServer,
		private readonly accountJid: string,
	) {}

	async publishDeviceList(deviceIds: number[]): Promise<void> {
		this.server.publishDeviceList(this.accountJid, deviceIds);
	}

	async fetchDeviceList(accountJid: string): Promise<number[] | null> {
		return this.server.getDeviceList(accountJid);
	}

	async publishBundle(bundle: OmemoPepBundle): Promise<void> {
		this.server.publishBundle(this.accountJid, bundle);
	}

	async fetchBundle(
		accountJid: string,
		deviceId: number,
	): Promise<OmemoPepBundle | null> {
		return this.server.getBundle(accountJid, deviceId);
	}

	async subscribeToDeviceList(): Promise<void> {}
}

function createAccount(
	accountJid: string,
	server: PepServer,
	raw: MemoryOmemoEnvelopePersistence,
): OmemoAccount {
	return new OmemoAccount({
		accountJid,
		pep: new TestPepClient(server, accountJid),
		raw,
	});
}

async function createReadyPair(): Promise<{
	server: PepServer;
	raw: MemoryOmemoEnvelopePersistence;
	alice: OmemoAccount;
	bob: OmemoAccount;
}> {
	const server = new PepServer();
	const raw = new MemoryOmemoEnvelopePersistence();
	const alice = createAccount(ALICE, server, raw);
	const bob = createAccount(BOB, server, raw);
	await alice.setup(PASSPHRASE);
	await bob.setup(PASSPHRASE);
	return { server, raw, alice, bob };
}

function requireDeviceId(account: OmemoAccount): number {
	if (account.deviceId === null) throw new Error("Expected a device ID");
	return account.deviceId;
}

describe("OmemoAccount", { timeout: 20_000 }, () => {
	it("probes setup, persists an envelope, then probes locked", async () => {
		const server = new PepServer();
		const raw = new MemoryOmemoEnvelopePersistence();
		const alice = createAccount(ALICE, server, raw);

		await expect(alice.probe()).resolves.toBe("setup");
		expect(alice.status).toBe("setup");

		await alice.setup(PASSPHRASE);

		expect(alice.status).toBe("ready");
		expect(alice.deviceId).toBeGreaterThan(0);
		expect(raw.getEnvelope(ALICE)).not.toBeNull();

		const next = createAccount(ALICE, server, raw);
		await expect(next.probe()).resolves.toBe("locked");
		expect(next.status).toBe("locked");
	});

	it("rejects setup when an envelope exists and weak passphrases", async () => {
		const { alice } = await createReadyPair();

		await expect(alice.setup(PASSPHRASE)).rejects.toMatchObject({
			code: "already-configured",
		});

		const fresh = createAccount(
			"carol@example.com",
			new PepServer(),
			new MemoryOmemoEnvelopePersistence(),
		);
		await expect(fresh.setup("short")).rejects.toMatchObject({
			code: "weak-passphrase",
		});
	});

	it("locks, rejects key operations, and unlocks with the right passphrase", async () => {
		const { alice } = await createReadyPair();
		const deviceId = requireDeviceId(alice);

		alice.lock();

		expect(alice.status).toBe("locked");
		expect(alice.deviceId).toBeNull();
		await expect(alice.localFingerprint()).rejects.toMatchObject({
			code: "locked",
		});
		await expect(alice.encryptFor(BOB, "hello")).rejects.toMatchObject({
			code: "locked",
		});

		await expect(alice.unlock(WRONG_PASSPHRASE)).rejects.toMatchObject({
			code: "invalid-passphrase",
		});
		expect(alice.status).toBe("error");

		await alice.unlock(PASSPHRASE);

		expect(alice.status).toBe("ready");
		expect(alice.deviceId).toBe(deviceId);
	});

	it("unlocks with the key from setup and rejects a key from another store", async () => {
		const server = new PepServer();
		const raw = new MemoryOmemoEnvelopePersistence();
		const alice = createAccount(ALICE, server, raw);
		const key = await alice.setup(PASSPHRASE);
		const fingerprint = await alice.localFingerprint();
		expect(key.extractable).toBe(false);
		alice.lock();

		await alice.unlockWithKey(key);
		expect(alice.status).toBe("ready");
		expect(await alice.localFingerprint()).toBe(fingerprint);
		alice.lock();

		const otherRaw = new MemoryOmemoEnvelopePersistence();
		const wrongKey = await createAccount(
			ALICE,
			new PepServer(),
			otherRaw,
		).setup(WRONG_PASSPHRASE);
		const restored = createAccount(ALICE, server, raw);
		await restored.probe();
		await expect(restored.unlockWithKey(wrongKey)).rejects.toMatchObject({
			code: "invalid-passphrase",
		});
		await expect(restored.probe()).resolves.toBe("locked");
	});

	it("produces a stable, grouped fingerprint without key bytes", async () => {
		const { alice } = await createReadyPair();

		const first = await alice.localFingerprint();
		const second = await alice.localFingerprint();

		expect(first).toBe(second);
		expect(first).toMatch(/^[A-F0-9]{8}( [A-F0-9]{8})+$/);
		expect(first).not.toMatch(/^[A-Za-z0-9+/=]+$/);
	});

	it("encrypts and decrypts between trusted devices", async () => {
		const { alice, bob } = await createReadyPair();
		const aliceDevice = requireDeviceId(alice);
		const bobDevice = requireDeviceId(bob);

		await alice.trustDevice(BOB, bobDevice);
		await bob.trustDevice(ALICE, aliceDevice);

		const envelope = await alice.encryptFor(BOB, "hello bob");
		expect(envelope.sid).toBe(aliceDevice);
		expect(envelope.keys.some((key) => key.rid === bobDevice)).toBe(true);

		const decrypted = await bob.decrypt(ALICE, envelope);
		expect(decrypted.plaintext).toBe("hello bob");
		expect(decrypted.senderDeviceId).toBe(aliceDevice);
		expect(decrypted.trusted).toBe(true);
	});

	it("blocks encryption until the recipient device is trusted", async () => {
		const { alice } = await createReadyPair();

		await expect(alice.encryptFor(BOB, "hello")).rejects.toMatchObject({
			code: "untrusted-device",
		});
	});

	it("fails closed when the peer has no devices", async () => {
		const { server, alice } = await createReadyPair();
		server.publishDeviceList(BOB, []);

		await expect(alice.encryptFor(BOB, "hello")).rejects.toMatchObject({
			code: "no-recipients",
		});
	});

	it("lists device fingerprints and trust state", async () => {
		const { alice, bob } = await createReadyPair();
		const bobDevice = requireDeviceId(bob);

		let devices = await alice.listDevices(BOB);
		expect(devices).toHaveLength(1);
		expect(devices[0]).toMatchObject({ deviceId: bobDevice, trusted: false });
		expect(devices[0]?.fingerprint).toMatch(/^[A-F0-9]{8}( [A-F0-9]{8})+$/);

		await alice.trustDevice(BOB, bobDevice);
		devices = await alice.listDevices(BOB);
		expect(devices[0]?.trusted).toBe(true);
	});

	it("skips device IDs whose bundle cannot be fetched", async () => {
		const { server, alice, bob } = await createReadyPair();
		const bobDevice = requireDeviceId(bob);
		const ownDevices = server.getDeviceList(BOB) ?? [];
		server.publishDeviceList(BOB, [...ownDevices, 999_999]);

		const devices = await alice.listDevices(BOB);
		expect(devices.map((device) => device.deviceId)).toEqual([bobDevice]);
	});

	it("binds trust to the reviewed fingerprint", async () => {
		const { alice, bob } = await createReadyPair();
		const bobDevice = requireDeviceId(bob);

		await expect(
			alice.trustDevice(
				BOB,
				bobDevice,
				"00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000000",
			),
		).rejects.toMatchObject({ code: "identity-changed" });
		const devices = await alice.listDevices(BOB);
		expect(devices[0]?.trusted).toBe(false);
	});

	it("rejects local operations while disabled", async () => {
		const alice = createAccount(
			ALICE,
			new PepServer(),
			new MemoryOmemoEnvelopePersistence(),
		);

		await expect(alice.encryptFor(BOB, "hello")).rejects.toMatchObject({
			code: "locked",
		});
		await expect(alice.listDevices(BOB)).rejects.toMatchObject({
			code: "locked",
		});
		await expect(alice.trustDevice(BOB, 1)).rejects.toMatchObject({
			code: "locked",
		});
		await expect(alice.localFingerprint()).rejects.toMatchObject({
			code: "locked",
		});
	});
});
