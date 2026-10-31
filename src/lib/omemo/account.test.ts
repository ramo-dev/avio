// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	ALICE,
	BOB,
	createAccount,
	createReadyPair,
	NEW_PASSPHRASE,
	PASSPHRASE,
	PepServer,
	requireDeviceId,
	WRONG_PASSPHRASE,
} from "#/lib/omemo/account.fixtures";
import { MemoryOmemoEnvelopePersistence } from "#/lib/omemo/memory-persistence";

describe("OmemoAccount", { timeout: 60_000 }, () => {
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

	it("repairs keys without changing the identity", async () => {
		const server = new PepServer();
		const raw = new MemoryOmemoEnvelopePersistence();
		const alice = createAccount(ALICE, server, raw);
		await alice.setup(PASSPHRASE);
		const deviceId = requireDeviceId(alice);
		const fingerprint = await alice.localFingerprint();

		await alice.repair();

		expect(alice.deviceId).toBe(deviceId);
		expect(await alice.localFingerprint()).toBe(fingerprint);
		expect(server.getDeviceList(ALICE)).toContain(deviceId);
	});

	it("resets to a new identity and removes the old device", async () => {
		const server = new PepServer();
		const raw = new MemoryOmemoEnvelopePersistence();
		const alice = createAccount(ALICE, server, raw);
		await alice.setup(PASSPHRASE);
		const oldDeviceId = requireDeviceId(alice);
		const oldFingerprint = await alice.localFingerprint();

		const key = await alice.reset(NEW_PASSPHRASE);

		expect(alice.status).toBe("ready");
		expect(alice.deviceId).not.toBe(oldDeviceId);
		expect(await alice.localFingerprint()).not.toBe(oldFingerprint);
		expect(key.extractable).toBe(false);
		const devices = server.getDeviceList(ALICE) ?? [];
		expect(devices).toContain(alice.deviceId);
		expect(devices).not.toContain(oldDeviceId);

		const restored = createAccount(ALICE, server, raw);
		await expect(restored.unlock(PASSPHRASE)).rejects.toMatchObject({
			code: "invalid-passphrase",
		});
		await restored.unlock(NEW_PASSPHRASE);
		expect(restored.deviceId).toBe(alice.deviceId);
	});

	it("rejects a reset that cannot proceed without touching the keys", async () => {
		const server = new PepServer();
		const raw = new MemoryOmemoEnvelopePersistence();
		const alice = createAccount(ALICE, server, raw);
		await alice.setup(PASSPHRASE);
		const fingerprint = await alice.localFingerprint();

		await expect(alice.reset("short")).rejects.toMatchObject({
			code: "weak-passphrase",
		});
		expect(alice.status).toBe("ready");
		expect(await alice.localFingerprint()).toBe(fingerprint);

		alice.lock();
		await expect(alice.reset(PASSPHRASE)).rejects.toMatchObject({
			code: "locked",
		});
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
