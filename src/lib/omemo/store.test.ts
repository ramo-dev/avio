// @vitest-environment node

import type { Direction } from "libomemo.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IndexedDbOmemoPersistence } from "#/lib/omemo/indexed-db-persistence";
import { MemoryOmemoPersistence } from "#/lib/omemo/memory-persistence";
import { OmemoKeyStore } from "#/lib/omemo/store";
import type { OmemoKeyPair } from "#/types/omemo";

const ACCOUNT = "alice@example.com";
const BOB_ADDRESS = "bob@example.com.1";
// libomemo.js declares `Direction` but does not export it at runtime.
const SENDING = 1 as Direction;
const RECEIVING = 2 as Direction;

function bytes(...values: number[]): ArrayBuffer {
	const buffer = new ArrayBuffer(values.length);
	new Uint8Array(buffer).set(values);
	return buffer;
}

function keyPair(pub: number[], priv: number[]): OmemoKeyPair {
	return { pubKey: bytes(...pub), privKey: bytes(...priv) };
}

function expectBytes(
	actual: ArrayBuffer | undefined,
	expected: ArrayBuffer,
): void {
	if (!actual) throw new Error("Expected key bytes to be present");
	expect(Array.from(new Uint8Array(actual))).toEqual(
		Array.from(new Uint8Array(expected)),
	);
}

describe("OmemoKeyStore", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("hydrates from empty persistence", async () => {
		const store = new OmemoKeyStore(ACCOUNT, new MemoryOmemoPersistence());
		await store.load();

		expect(await store.getIdentityKeyPair()).toBeUndefined();
		expect(await store.getLocalRegistrationId()).toBeUndefined();
		expect(await store.loadIdentityKey(BOB_ADDRESS)).toBeUndefined();
		expect(await store.loadPreKey(1)).toBeUndefined();
		expect(await store.loadSignedPreKey(1)).toBeUndefined();
		expect(await store.loadSession(BOB_ADDRESS)).toBeUndefined();
	});

	it("roundtrips the identity key and registration ID across instances", async () => {
		const persistence = new MemoryOmemoPersistence();
		const identity = keyPair([1, 2, 3], [4, 5, 6]);
		const first = new OmemoKeyStore(ACCOUNT, persistence);
		await first.load();
		await first.saveIdentityKeyPair(identity);
		await first.saveLocalRegistrationId(4242);

		const second = new OmemoKeyStore(ACCOUNT, persistence);
		await second.load();

		const loadedIdentity = await second.getIdentityKeyPair();
		expect(loadedIdentity).toBeDefined();
		expectBytes(loadedIdentity?.pubKey, identity.pubKey);
		expectBytes(loadedIdentity?.privKey, identity.privKey);
		expect(await second.getLocalRegistrationId()).toBe(4242);
	});

	it("returns defensive copies of key material", async () => {
		const persistence = new MemoryOmemoPersistence();
		const store = new OmemoKeyStore(ACCOUNT, persistence);
		await store.load();
		const preKey = keyPair([10, 11], [12, 13]);
		const identity = keyPair([1, 2], [3, 4]);

		await store.storePreKey(7, preKey);
		await store.storeSignedPreKey(9, preKey);
		await store.saveIdentityKeyPair(identity);
		await store.saveIdentity(BOB_ADDRESS, bytes(5, 6));

		const loadedPreKey = await store.loadPreKey(7);
		const loadedSignedPreKey = await store.loadSignedPreKey(9);
		const loadedIdentityKey = await store.loadIdentityKey(BOB_ADDRESS);
		const loadedIdentityPair = await store.getIdentityKeyPair();
		if (
			!loadedPreKey ||
			!loadedSignedPreKey ||
			!loadedIdentityKey ||
			!loadedIdentityPair
		) {
			throw new Error("Expected all key material to be present");
		}

		new Uint8Array(loadedPreKey.keyPair.pubKey)[0] = 99;
		new Uint8Array(loadedSignedPreKey.keyPair.pubKey)[0] = 99;
		new Uint8Array(loadedIdentityKey)[0] = 99;
		new Uint8Array(loadedIdentityPair.pubKey)[0] = 99;

		expectBytes((await store.loadPreKey(7))?.keyPair.pubKey, preKey.pubKey);
		expectBytes(
			(await store.loadSignedPreKey(9))?.keyPair.pubKey,
			preKey.pubKey,
		);
		expectBytes(await store.loadIdentityKey(BOB_ADDRESS), bytes(5, 6));
		expectBytes((await store.getIdentityKeyPair())?.pubKey, identity.pubKey);
	});

	it("roundtrips pre-keys and signed pre-keys", async () => {
		const persistence = new MemoryOmemoPersistence();
		const preKey = keyPair([10, 11], [12, 13]);
		const signedPreKey = keyPair([20, 21], [22, 23]);
		const first = new OmemoKeyStore(ACCOUNT, persistence);
		await first.load();
		await first.storePreKey(7, preKey);
		await first.storePreKey("11", keyPair([30], [31]));
		await first.storeSignedPreKey(9, signedPreKey);

		const second = new OmemoKeyStore(ACCOUNT, persistence);
		await second.load();
		expectBytes((await second.loadPreKey(7))?.keyPair.pubKey, preKey.pubKey);
		expectBytes((await second.loadPreKey("11"))?.keyPair.privKey, bytes(31));
		expectBytes(
			(await second.loadSignedPreKey(9))?.keyPair.privKey,
			signedPreKey.privKey,
		);

		await second.removePreKey(7);
		await second.removeSignedPreKey(9);
		expect(await second.loadPreKey(7)).toBeUndefined();
		expect(await second.loadSignedPreKey(9)).toBeUndefined();

		const third = new OmemoKeyStore(ACCOUNT, persistence);
		await third.load();
		expect(await third.loadPreKey(7)).toBeUndefined();
		expect(await third.loadSignedPreKey(9)).toBeUndefined();
	});

	it("stores, loads, and removes sessions", async () => {
		const persistence = new MemoryOmemoPersistence();
		const first = new OmemoKeyStore(ACCOUNT, persistence);
		await first.load();
		await first.storeSession(BOB_ADDRESS, "record-1");

		const second = new OmemoKeyStore(ACCOUNT, persistence);
		await second.load();
		expect(await second.loadSession(BOB_ADDRESS)).toBe("record-1");

		await second.removeSession(BOB_ADDRESS);
		const third = new OmemoKeyStore(ACCOUNT, persistence);
		await third.load();
		expect(await third.loadSession(BOB_ADDRESS)).toBeUndefined();
	});

	it("trusts unknown and matching identities and detects changes", async () => {
		const persistence = new MemoryOmemoPersistence();
		const store = new OmemoKeyStore(ACCOUNT, persistence);
		await store.load();
		const identity = bytes(1, 2, 3);
		const changed = bytes(1, 2, 4);

		expect(await store.isTrustedIdentity(BOB_ADDRESS, identity, SENDING)).toBe(
			true,
		);
		expect(await store.saveIdentity(BOB_ADDRESS, identity)).toBe(false);
		expect(
			await store.isTrustedIdentity(BOB_ADDRESS, identity, RECEIVING),
		).toBe(true);
		expect(await store.isTrustedIdentity(BOB_ADDRESS, changed, SENDING)).toBe(
			false,
		);
		expect(await store.saveIdentity(BOB_ADDRESS, changed)).toBe(true);

		const reloaded = new OmemoKeyStore(ACCOUNT, persistence);
		await reloaded.load();
		expectBytes(await reloaded.loadIdentityKey(BOB_ADDRESS), changed);
		expect(
			await reloaded.isTrustedIdentity(BOB_ADDRESS, identity, SENDING),
		).toBe(false);
	});

	it("removes only sessions for the exact bare JID", async () => {
		const persistence = new MemoryOmemoPersistence();
		const jid = "bob@example.com";
		const store = new OmemoKeyStore(ACCOUNT, persistence);
		await store.load();
		await store.storeSession(`${jid}.1`, "one");
		await store.storeSession(`${jid}.12`, "twelve");
		await store.storeSession(`${jid}.extra.3`, "extra");
		await store.storeSession("bob@example.come.4", "come");
		await store.storeSession("bobby@example.com.5", "bobby");
		await store.storeSession(`${jid}.work`, "work");
		await store.storeSession("alice@example.com.1", "alice");

		await store.removeAllSessions(jid);

		expect(await store.loadSession(`${jid}.1`)).toBeUndefined();
		expect(await store.loadSession(`${jid}.12`)).toBeUndefined();
		expect(await store.loadSession(`${jid}.extra.3`)).toBe("extra");
		expect(await store.loadSession("bob@example.come.4")).toBe("come");
		expect(await store.loadSession("bobby@example.com.5")).toBe("bobby");
		expect(await store.loadSession(`${jid}.work`)).toBe("work");
		expect(await store.loadSession("alice@example.com.1")).toBe("alice");

		const reloaded = new OmemoKeyStore(ACCOUNT, persistence);
		await reloaded.load();
		expect(await reloaded.loadSession(`${jid}.1`)).toBeUndefined();
		expect(await reloaded.loadSession(`${jid}.extra.3`)).toBe("extra");
	});

	it("supports the synchronous generic map", () => {
		const store = new OmemoKeyStore(ACCOUNT, new MemoryOmemoPersistence());
		store.put("alpha", 1);
		store.put("beta", "two");

		expect(store.get<number>("alpha")).toBe(1);
		expect(store.get("missing", "fallback")).toBe("fallback");
		expect(store.store.alpha).toBe(1);

		store.remove("alpha");
		expect(store.get("alpha")).toBeUndefined();
		expect(store.store.beta).toBe("two");
	});

	it("roundtrips lifecycle metadata, prekey lists, and trusted identities", async () => {
		const persistence = new MemoryOmemoPersistence();
		const first = new OmemoKeyStore(ACCOUNT, persistence);
		await first.load();
		await first.saveDeviceId(1234);
		await first.saveCurrentSignedPreKeyId(5);
		await first.saveSignedPreKeySignature(5, bytes(1, 2));
		await first.storePreKey(9, keyPair([10], [11]));
		await first.storePreKey(3, keyPair([12], [13]));
		await first.saveTrustedIdentity(BOB_ADDRESS, bytes(4, 5));

		expect(await first.listPreKeyIds()).toEqual([3, 9]);
		expect((await first.listPreKeys()).map((preKey) => preKey.id)).toEqual([
			3, 9,
		]);

		const second = new OmemoKeyStore(ACCOUNT, persistence);
		await second.load();
		expect(await second.getDeviceId()).toBe(1234);
		expect(await second.getCurrentSignedPreKeyId()).toBe(5);
		expectBytes(await second.loadSignedPreKeySignature(5), bytes(1, 2));
		expectBytes(await second.loadTrustedIdentity(BOB_ADDRESS), bytes(4, 5));

		const signature = await second.loadSignedPreKeySignature(5);
		const trusted = await second.loadTrustedIdentity(BOB_ADDRESS);
		const listed = await second.listPreKeys();
		if (!signature || !trusted || !listed[0]) {
			throw new Error("Expected lifecycle data to be present");
		}
		new Uint8Array(signature)[0] = 99;
		new Uint8Array(trusted)[0] = 99;
		new Uint8Array(listed[0].keyPair.pubKey)[0] = 99;

		expectBytes(await second.loadSignedPreKeySignature(5), bytes(1, 2));
		expectBytes(await second.loadTrustedIdentity(BOB_ADDRESS), bytes(4, 5));
		expectBytes((await second.loadPreKey(3))?.keyPair.pubKey, bytes(12));

		await second.removeTrustedIdentity(BOB_ADDRESS);
		expect(await second.loadTrustedIdentity(BOB_ADDRESS)).toBeUndefined();
	});

	it("clears in-memory state and persistence", async () => {
		const persistence = new MemoryOmemoPersistence();
		const store = new OmemoKeyStore(ACCOUNT, persistence);
		await store.load();
		await store.saveIdentityKeyPair(keyPair([1], [2]));
		await store.saveLocalRegistrationId(7);
		await store.storeSession(BOB_ADDRESS, "record");
		store.put("generic", "value");

		await store.clear();

		expect(await store.getIdentityKeyPair()).toBeUndefined();
		expect(await store.getLocalRegistrationId()).toBeUndefined();
		expect(await store.loadSession(BOB_ADDRESS)).toBeUndefined();
		expect(store.get("generic")).toBeUndefined();

		const reloaded = new OmemoKeyStore(ACCOUNT, persistence);
		await reloaded.load();
		expect(await reloaded.getIdentityKeyPair()).toBeUndefined();
		expect(await reloaded.loadSession(BOB_ADDRESS)).toBeUndefined();
	});

	it("rejects clearly when IndexedDB is unavailable", async () => {
		vi.stubGlobal("indexedDB", undefined);
		const persistence = new IndexedDbOmemoPersistence();

		await expect(persistence.loadEnvelope(ACCOUNT)).rejects.toThrow(
			"IndexedDB is not available",
		);
	});
});
