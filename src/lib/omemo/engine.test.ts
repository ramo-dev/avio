// @vitest-environment node

import { describe, expect, it } from "vitest";
import { decodeBase64, encodeBase64 } from "#/lib/omemo/base64";
import { OmemoEngine } from "#/lib/omemo/engine";
import { MemoryOmemoPersistence } from "#/lib/omemo/memory-persistence";
import { OmemoKeyStore } from "#/lib/omemo/store";
import type {
	OmemoKeyPair,
	OmemoPepBundle,
	OmemoPepClient,
} from "#/types/omemo";

const ALICE = "alice@example.com";
const BOB = "bob@example.com";
const MAX_DEVICE_ID = 0x7fff_ffff;

class PepServer {
	private readonly deviceLists = new Map<string, number[]>();
	private readonly bundles = new Map<string, Map<number, OmemoPepBundle>>();

	setDeviceList(accountJid: string, deviceIds: number[]): void {
		this.deviceLists.set(accountJid, [...deviceIds]);
	}

	getDeviceList(accountJid: string): number[] | null {
		const deviceIds = this.deviceLists.get(accountJid);
		return deviceIds ? [...deviceIds] : null;
	}

	getBundle(accountJid: string, deviceId: number): OmemoPepBundle | null {
		const bundle = this.bundles.get(accountJid)?.get(deviceId);
		return bundle ? structuredClone(bundle) : null;
	}

	publishDeviceList(accountJid: string, deviceIds: number[]): void {
		this.deviceLists.set(
			accountJid,
			[...deviceIds].sort((left, right) => left - right),
		);
	}

	publishBundle(accountJid: string, bundle: OmemoPepBundle): void {
		const bundles = this.bundles.get(accountJid) ?? new Map();
		bundles.set(bundle.deviceId, structuredClone(bundle));
		this.bundles.set(accountJid, bundles);
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

function createEngine(
	accountJid: string,
	persistence: MemoryOmemoPersistence,
	server: PepServer,
	deviceIdFactory?: () => number,
): { store: OmemoKeyStore; engine: OmemoEngine } {
	const store = new OmemoKeyStore(accountJid, persistence);
	const engine = new OmemoEngine({
		store,
		pep: new TestPepClient(server, accountJid),
		accountJid,
		deviceIdFactory,
	});
	return { store, engine };
}

function bytesOf(buffer: ArrayBuffer | undefined): number[] {
	if (!buffer) throw new Error("Expected key bytes to be present");
	return Array.from(new Uint8Array(buffer));
}

function requireKeyPair(keyPair: OmemoKeyPair | undefined): OmemoKeyPair {
	if (!keyPair) throw new Error("Expected a key pair to be present");
	return keyPair;
}

describe("OmemoEngine", () => {
	it("initializes identity, registration, device, signed prekey, and 100 prekeys", async () => {
		const server = new PepServer();
		const { store, engine } = createEngine(
			ALICE,
			new MemoryOmemoPersistence(),
			server,
		);

		const result = await engine.initialize();

		expect(result.deviceId).toBeGreaterThanOrEqual(1);
		expect(result.deviceId).toBeLessThanOrEqual(MAX_DEVICE_ID);
		expect(Number.isInteger(result.registrationId)).toBe(true);
		expect(await store.getIdentityKeyPair()).toBeDefined();
		expect(await store.getLocalRegistrationId()).toBe(result.registrationId);
		expect(await store.getDeviceId()).toBe(result.deviceId);
		expect(await store.getCurrentSignedPreKeyId()).toBe(1);
		expect(await store.loadSignedPreKey(1)).toBeDefined();
		expect(await store.loadSignedPreKeySignature(1)).toBeDefined();
		expect(await store.listPreKeys()).toHaveLength(100);
		expect(server.getBundle(ALICE, result.deviceId)).toEqual(result.bundle);
		expect(server.getDeviceList(ALICE)).toEqual([result.deviceId]);
	});

	it("reuses identity, device, registration, and signed prekey on reload", async () => {
		const server = new PepServer();
		const persistence = new MemoryOmemoPersistence();
		const first = createEngine(ALICE, persistence, server);
		const firstResult = await first.engine.initialize();
		const firstIdentity = requireKeyPair(
			await first.store.getIdentityKeyPair(),
		);
		const firstSigned = requireKeyPair(
			(await first.store.loadSignedPreKey(1))?.keyPair,
		);

		const second = createEngine(ALICE, persistence, server);
		const secondResult = await second.engine.initialize();
		const secondIdentity = requireKeyPair(
			await second.store.getIdentityKeyPair(),
		);
		const secondSigned = requireKeyPair(
			(await second.store.loadSignedPreKey(1))?.keyPair,
		);

		expect(secondResult.deviceId).toBe(firstResult.deviceId);
		expect(secondResult.registrationId).toBe(firstResult.registrationId);
		expect(bytesOf(secondIdentity.pubKey)).toEqual(
			bytesOf(firstIdentity.pubKey),
		);
		expect(bytesOf(secondSigned.pubKey)).toEqual(bytesOf(firstSigned.pubKey));
		expect(await second.store.getCurrentSignedPreKeyId()).toBe(1);
		expect(await second.store.listPreKeys()).toHaveLength(100);
	});

	it("uses an injected device ID factory and avoids the own device list", async () => {
		const server = new PepServer();
		server.setDeviceList(ALICE, [7, 42]);
		const sequence = [42, 99];
		const factory = (): number => sequence.shift() ?? 1000;
		const { engine } = createEngine(
			ALICE,
			new MemoryOmemoPersistence(),
			server,
			factory,
		);

		const result = await engine.initialize();

		expect(result.deviceId).toBe(99);
		expect(server.getDeviceList(ALICE)).toEqual([7, 42, 99]);
	});

	it("assembles a base64 legacy bundle", async () => {
		const server = new PepServer();
		const { store, engine } = createEngine(
			ALICE,
			new MemoryOmemoPersistence(),
			server,
		);
		const result = await engine.initialize();
		const identity = requireKeyPair(await store.getIdentityKeyPair());
		const bundle = await engine.createBundle();

		expect(bundle.deviceId).toBe(result.deviceId);
		expect(bundle.signedPreKeyId).toBe(1);
		expect(bundle.identityKey).toBe(
			encodeBase64(new Uint8Array(identity.pubKey)),
		);
		for (const value of [
			bundle.identityKey,
			bundle.signedPreKeyPublic,
			bundle.signedPreKeySignature,
		]) {
			expect(decodeBase64(value)).not.toBeNull();
		}
		expect(bundle.preKeys).toHaveLength(100);
		for (const preKey of bundle.preKeys) {
			expect(Number.isInteger(preKey.id)).toBe(true);
			expect(decodeBase64(preKey.publicKey)).not.toBeNull();
		}
	});

	it("builds a session from another device bundle", async () => {
		const server = new PepServer();
		const alice = createEngine(ALICE, new MemoryOmemoPersistence(), server);
		const bob = createEngine(BOB, new MemoryOmemoPersistence(), server);
		await alice.engine.initialize();
		const bobResult = await bob.engine.initialize();

		await alice.engine.buildSession(BOB, bobResult.deviceId);

		expect(
			await alice.store.loadSession(`${BOB}.${bobResult.deviceId}`),
		).toBeDefined();
	});

	it("gates trust on the saved identity and detects changes", async () => {
		const server = new PepServer();
		const alice = createEngine(ALICE, new MemoryOmemoPersistence(), server);
		const bob = createEngine(BOB, new MemoryOmemoPersistence(), server);
		await alice.engine.initialize();
		const bobResult = await bob.engine.initialize();
		await alice.engine.buildSession(BOB, bobResult.deviceId);

		expect(await alice.engine.isTrustedDevice(BOB, bobResult.deviceId)).toBe(
			false,
		);
		await expect(
			alice.engine.requireTrustedDevice(BOB, bobResult.deviceId),
		).rejects.toMatchObject({ code: "untrusted-device" });

		await alice.engine.trustDevice(BOB, bobResult.deviceId);
		expect(await alice.engine.isTrustedDevice(BOB, bobResult.deviceId)).toBe(
			true,
		);
		await expect(
			alice.engine.requireTrustedDevice(BOB, bobResult.deviceId),
		).resolves.toBeUndefined();

		const address = `${BOB}.${bobResult.deviceId}`;
		server.publishBundle(BOB, {
			...bobResult.bundle,
			identityKey: encodeBase64(new Uint8Array(33).fill(9)),
		});
		await expect(
			alice.engine.buildSession(BOB, bobResult.deviceId),
		).rejects.toMatchObject({ code: "identity-changed" });
		expect(await alice.engine.isTrustedDevice(BOB, bobResult.deviceId)).toBe(
			false,
		);
		expect(await alice.store.loadIdentityKey(address)).toBeDefined();
		await expect(alice.engine.trustDevice(BOB, 999_999)).rejects.toMatchObject({
			code: "bundle-missing",
		});
	});

	it("rejects a missing bundle", async () => {
		const { engine } = createEngine(
			ALICE,
			new MemoryOmemoPersistence(),
			new PepServer(),
		);

		await expect(engine.buildSession(BOB, 1234)).rejects.toMatchObject({
			code: "bundle-missing",
		});
	});

	it("tops prekeys back up after falling below the minimum", async () => {
		const server = new PepServer();
		const persistence = new MemoryOmemoPersistence();
		const first = createEngine(ALICE, persistence, server);
		await first.engine.initialize();
		for (let keyId = 1; keyId <= 90; keyId += 1) {
			await first.store.removePreKey(keyId);
		}
		expect(await first.store.listPreKeyIds()).toHaveLength(10);

		const second = createEngine(ALICE, persistence, server);
		await second.engine.initialize();
		const ids = await second.store.listPreKeyIds();

		expect(ids).toHaveLength(100);
		expect(Math.min(...ids)).toBe(91);
		expect(Math.max(...ids)).toBe(190);
	});
});
