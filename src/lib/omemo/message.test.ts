// @vitest-environment node

import { describe, expect, it } from "vitest";
import { decodeBase64, encodeBase64 } from "#/lib/omemo/base64";
import { OmemoEngine } from "#/lib/omemo/engine";
import { MemoryOmemoPersistence } from "#/lib/omemo/memory-persistence";
import { OmemoMessageCipher } from "#/lib/omemo/message";
import { OmemoKeyStore } from "#/lib/omemo/store";
import type {
	OmemoEncryptedMessage,
	OmemoPepBundle,
	OmemoPepClient,
} from "#/types/omemo";

const ALICE = "alice@example.com";
const BOB = "bob@example.com";
const ALICE_DEVICE = 1001;
const BOB_DEVICE = 2002;

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

interface Party {
	store: OmemoKeyStore;
	engine: OmemoEngine;
	cipher: OmemoMessageCipher;
}

async function createParty(
	accountJid: string,
	server: PepServer,
	deviceId: number,
): Promise<Party> {
	const store = new OmemoKeyStore(accountJid, new MemoryOmemoPersistence());
	const engine = new OmemoEngine({
		store,
		pep: new TestPepClient(server, accountJid),
		accountJid,
		deviceIdFactory: () => deviceId,
	});
	const cipher = new OmemoMessageCipher({ engine, store, accountJid });
	await engine.initialize();
	return { store, engine, cipher };
}

async function createPair(): Promise<{
	server: PepServer;
	alice: Party;
	bob: Party;
}> {
	const server = new PepServer();
	const alice = await createParty(ALICE, server, ALICE_DEVICE);
	const bob = await createParty(BOB, server, BOB_DEVICE);
	return { server, alice, bob };
}

function bytes(value: string): Uint8Array<ArrayBuffer> {
	const decoded = decodeBase64(value);
	if (!decoded) throw new Error("Expected valid base64");
	return decoded;
}

function requireKey(
	envelope: OmemoEncryptedMessage,
	rid: number,
): OmemoEncryptedMessage["keys"][number] {
	const key = envelope.keys.find((candidate) => candidate.rid === rid);
	if (!key) throw new Error("Expected a key for the device");
	return key;
}

describe("OmemoMessageCipher", () => {
	it("encrypts a prekey message and Bob decrypts it", async () => {
		const { server, alice, bob } = await createPair();
		const before = server.getBundle(BOB, BOB_DEVICE);
		if (!before) throw new Error("Expected Bob's bundle");
		await alice.engine.trustDevice(BOB, BOB_DEVICE);

		const envelope = await alice.cipher.encryptMessage(BOB, "hello", [
			BOB_DEVICE,
			BOB_DEVICE,
		]);
		const key = requireKey(envelope, BOB_DEVICE);

		expect(envelope.keys).toHaveLength(1);
		expect(key.preKey).toBe(true);
		expect(envelope.sid).toBe(ALICE_DEVICE);
		expect(bytes(envelope.iv)).toHaveLength(12);
		expect(bytes(envelope.payload).length).toBeGreaterThan(0);
		expect(bytes(key.value).length).toBeGreaterThan(0);

		const decrypted = await bob.cipher.decryptMessage(ALICE, envelope);

		expect(decrypted.plaintext).toBe("hello");
		expect(decrypted.senderJid).toBe(ALICE);
		expect(decrypted.senderDeviceId).toBe(ALICE_DEVICE);
		expect(decrypted.trusted).toBe(false);
		expect(decrypted.bundleRefreshed).toBe(true);

		const after = server.getBundle(BOB, BOB_DEVICE);
		if (!after) throw new Error("Expected a republished bundle");
		expect(after.preKeys).toHaveLength(before.preKeys.length - 1);
		const afterIds = new Set(after.preKeys.map((preKey) => preKey.id));
		const consumed = before.preKeys
			.map((preKey) => preKey.id)
			.filter((id) => !afterIds.has(id));
		expect(consumed).toHaveLength(1);
		expect(await bob.store.loadPreKey(consumed[0] ?? 0)).toBeUndefined();
	});

	it("sends a non-prekey reply and decrypts it with trust", async () => {
		const { alice, bob } = await createPair();
		await alice.engine.trustDevice(BOB, BOB_DEVICE);
		await bob.engine.trustDevice(ALICE, ALICE_DEVICE);

		const first = await alice.cipher.encryptMessage(BOB, "hello", [BOB_DEVICE]);
		await bob.cipher.decryptMessage(ALICE, first);

		const reply = await bob.cipher.encryptMessage(ALICE, "hi alice", [
			ALICE_DEVICE,
		]);
		expect(requireKey(reply, ALICE_DEVICE).preKey).toBe(false);

		const decrypted = await alice.cipher.decryptMessage(BOB, reply);

		expect(decrypted.plaintext).toBe("hi alice");
		expect(decrypted.trusted).toBe(true);
		expect(decrypted.bundleRefreshed).toBe(false);
	});

	it("rejects an untrusted recipient before building a session", async () => {
		const { alice } = await createPair();

		await expect(
			alice.cipher.encryptMessage(BOB, "hello", [BOB_DEVICE]),
		).rejects.toMatchObject({ code: "untrusted-device" });
		expect(
			await alice.store.loadSession(`${BOB}.${BOB_DEVICE}`),
		).toBeUndefined();
	});

	it("rejects an empty recipient list", async () => {
		const { alice } = await createPair();

		await expect(
			alice.cipher.encryptMessage(BOB, "hello", []),
		).rejects.toMatchObject({ code: "no-recipients" });
	});

	it("rejects an envelope without a key for the local device", async () => {
		const { alice, bob } = await createPair();
		await alice.engine.trustDevice(BOB, BOB_DEVICE);
		const envelope = await alice.cipher.encryptMessage(BOB, "hello", [
			BOB_DEVICE,
		]);
		const key = requireKey(envelope, BOB_DEVICE);

		await expect(
			bob.cipher.decryptMessage(ALICE, {
				...envelope,
				keys: [{ ...key, rid: 999_999 }],
			}),
		).rejects.toMatchObject({ code: "no-device-key" });
	});

	it("rejects a tampered payload", async () => {
		const { alice, bob } = await createPair();
		await alice.engine.trustDevice(BOB, BOB_DEVICE);
		const envelope = await alice.cipher.encryptMessage(BOB, "hello", [
			BOB_DEVICE,
		]);
		const payload = bytes(envelope.payload).slice();
		payload[0] = (payload[0] ?? 0) ^ 0xff;

		await expect(
			bob.cipher.decryptMessage(ALICE, {
				...envelope,
				payload: encodeBase64(payload),
			}),
		).rejects.toMatchObject({ code: "decrypt-failed" });
	});

	it("rejects malformed base64 and IVs", async () => {
		const { alice, bob } = await createPair();
		await alice.engine.trustDevice(BOB, BOB_DEVICE);
		const envelope = await alice.cipher.encryptMessage(BOB, "hello", [
			BOB_DEVICE,
		]);
		const key = requireKey(envelope, BOB_DEVICE);

		for (const malformed of [
			{ ...envelope, iv: "%%%not-base64%%%" },
			{ ...envelope, iv: encodeBase64(new Uint8Array(8)) },
			{ ...envelope, payload: "%%%not-base64%%%" },
			{ ...envelope, keys: [{ ...key, value: "" }] },
			{ ...envelope, sid: 0 },
		]) {
			await expect(
				bob.cipher.decryptMessage(ALICE, malformed),
			).rejects.toMatchObject({ code: "invalid-envelope" });
		}
	});

	it("rejects a changed sender identity and clears app trust", async () => {
		const { alice, bob } = await createPair();
		await alice.engine.trustDevice(BOB, BOB_DEVICE);
		await bob.engine.trustDevice(ALICE, ALICE_DEVICE);

		const first = await alice.cipher.encryptMessage(BOB, "hello", [BOB_DEVICE]);
		await bob.cipher.decryptMessage(ALICE, first);
		const reply = await bob.cipher.encryptMessage(ALICE, "reply", [
			ALICE_DEVICE,
		]);
		await alice.cipher.decryptMessage(BOB, reply);

		const address = `${ALICE}.${ALICE_DEVICE}`;
		await bob.store.saveIdentity(address, new Uint8Array(33).fill(7).buffer);

		const second = await alice.cipher.encryptMessage(BOB, "again", [
			BOB_DEVICE,
		]);
		expect(requireKey(second, BOB_DEVICE).preKey).toBe(false);

		await expect(
			bob.cipher.decryptMessage(ALICE, second),
		).rejects.toMatchObject({ code: "identity-changed" });
		expect(await bob.store.loadTrustedIdentity(address)).toBeUndefined();
		expect(await bob.engine.isTrustedDevice(ALICE, ALICE_DEVICE)).toBe(false);
	});
});
