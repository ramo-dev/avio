// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeBase64 } from "#/lib/omemo/base64";
import { EncryptedOmemoPersistence } from "#/lib/omemo/encrypted-persistence";
import {
	ACCOUNT,
	BOB_ADDRESS,
	bytes,
	createUnlocked,
	expectBytes,
	expectFixtureState,
	fixtureState,
	keyPair,
	OTHER_ACCOUNT,
	PASSPHRASE,
	tamperCiphertext,
	WRONG_PASSPHRASE,
} from "#/lib/omemo/encrypted-persistence.fixtures";
import { IndexedDbOmemoPersistence } from "#/lib/omemo/indexed-db-persistence";
import { MemoryOmemoEnvelopePersistence } from "#/lib/omemo/memory-persistence";
import { OmemoKeyStore } from "#/lib/omemo/store";
import { createEmptyState } from "#/lib/omemo/store-state";

describe("EncryptedOmemoPersistence", { timeout: 20_000 }, () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("unlocks with no record and round-trips all state", async () => {
		const persistence = await createUnlocked(
			new MemoryOmemoEnvelopePersistence(),
		);

		expect(persistence.isUnlocked).toBe(true);
		expect(await persistence.load(ACCOUNT)).toBeNull();

		await persistence.save(ACCOUNT, fixtureState());
		expectFixtureState(await persistence.load(ACCOUNT));
	});

	it("lets a new wrapper unlock the same record", async () => {
		const raw = new MemoryOmemoEnvelopePersistence();
		const first = await createUnlocked(raw);
		await first.save(ACCOUNT, fixtureState());

		const second = new EncryptedOmemoPersistence(ACCOUNT, raw);
		await second.unlock(PASSPHRASE);

		expect(second.isUnlocked).toBe(true);
		expectFixtureState(await second.load(ACCOUNT));
	});

	it("rejects a wrong passphrase and stays locked", async () => {
		const raw = new MemoryOmemoEnvelopePersistence();
		const first = await createUnlocked(raw);
		await first.save(ACCOUNT, fixtureState());

		const intruder = new EncryptedOmemoPersistence(ACCOUNT, raw);
		await expect(intruder.unlock(WRONG_PASSPHRASE)).rejects.toMatchObject({
			code: "invalid-passphrase",
		});
		expect(intruder.isUnlocked).toBe(false);
		await expect(intruder.load(ACCOUNT)).rejects.toMatchObject({
			code: "locked",
		});
	});

	it("rejects an empty passphrase without unlocking", async () => {
		const persistence = new EncryptedOmemoPersistence(
			ACCOUNT,
			new MemoryOmemoEnvelopePersistence(),
		);
		await expect(persistence.unlock("")).rejects.toMatchObject({
			code: "invalid-passphrase",
		});
		expect(persistence.isUnlocked).toBe(false);
	});

	it("rejects load and save while locked", async () => {
		const persistence = await createUnlocked(
			new MemoryOmemoEnvelopePersistence(),
		);
		await persistence.save(ACCOUNT, fixtureState());
		persistence.lock();

		expect(persistence.isUnlocked).toBe(false);
		await expect(persistence.load(ACCOUNT)).rejects.toMatchObject({
			code: "locked",
		});
		await expect(
			persistence.save(ACCOUNT, fixtureState()),
		).rejects.toMatchObject({ code: "locked" });
	});

	it("rejects tampered ciphertext", async () => {
		const raw = new MemoryOmemoEnvelopePersistence();
		const persistence = await createUnlocked(raw);
		await persistence.save(ACCOUNT, fixtureState());
		const envelope = raw.getEnvelope(ACCOUNT);
		if (!envelope) throw new Error("Expected a stored envelope");
		await raw.saveEnvelope(ACCOUNT, {
			...envelope,
			ciphertext: tamperCiphertext(envelope.ciphertext),
		});

		await expect(persistence.load(ACCOUNT)).rejects.toMatchObject({
			code: "decryption-failed",
		});
	});

	it("authenticates KDF metadata and rejects extreme iteration counts", async () => {
		const raw = new MemoryOmemoEnvelopePersistence();
		const persistence = await createUnlocked(raw);
		await persistence.save(ACCOUNT, fixtureState());

		const envelope = raw.getEnvelope(ACCOUNT);
		if (!envelope) throw new Error("Expected a stored envelope");
		for (const patch of [
			{ iterations: envelope.iterations + 1 },
			{ salt: encodeBase64(new Uint8Array(16).fill(7)) },
		]) {
			await raw.saveEnvelope(ACCOUNT, { ...envelope, ...patch });
			await expect(persistence.load(ACCOUNT)).rejects.toMatchObject({
				code: "decryption-failed",
			});
		}

		await raw.saveEnvelope(ACCOUNT, { ...envelope, iterations: 9_999_999 });
		const next = new EncryptedOmemoPersistence(ACCOUNT, raw);
		await expect(next.unlock(PASSPHRASE)).rejects.toMatchObject({
			code: "unsupported-envelope",
		});
	});

	it("clears the record while locked", async () => {
		const raw = new MemoryOmemoEnvelopePersistence();
		const persistence = await createUnlocked(raw);
		await persistence.save(ACCOUNT, fixtureState());
		persistence.lock();

		await persistence.clear(ACCOUNT);

		expect(persistence.isUnlocked).toBe(false);
		expect(raw.getEnvelope(ACCOUNT)).toBeNull();
		await expect(persistence.load(ACCOUNT)).rejects.toMatchObject({
			code: "locked",
		});
	});

	it("never stores the passphrase or plaintext key material", async () => {
		const raw = new MemoryOmemoEnvelopePersistence();
		const persistence = await createUnlocked(raw);
		await persistence.save(ACCOUNT, fixtureState());

		const envelope = raw.getEnvelope(ACCOUNT);
		if (!envelope) throw new Error("Expected a stored envelope");
		const serialized = JSON.stringify(envelope);

		expect(serialized).not.toContain(PASSPHRASE);
		expect(serialized).not.toContain("session-record");
		for (const value of [
			bytes(1, 2, 3, 4, 5, 6, 7, 8),
			bytes(17, 18, 19, 20),
		]) {
			expect(serialized).not.toContain(encodeBase64(new Uint8Array(value)));
		}
	});

	it("validates the account for every operation", async () => {
		const persistence = await createUnlocked(
			new MemoryOmemoEnvelopePersistence(),
		);
		await persistence.save(ACCOUNT, fixtureState());

		for (const operation of [
			() => persistence.load(OTHER_ACCOUNT),
			() => persistence.save(OTHER_ACCOUNT, createEmptyState()),
			() => persistence.clear(OTHER_ACCOUNT),
		]) {
			await expect(operation()).rejects.toMatchObject({
				code: "account-mismatch",
			});
		}
	});

	it("works end-to-end with OmemoKeyStore", async () => {
		const raw = new MemoryOmemoEnvelopePersistence();
		const wrapper = await createUnlocked(raw);
		const first = new OmemoKeyStore(ACCOUNT, wrapper);
		await first.load();
		await first.saveIdentityKeyPair(
			fixtureState().identityKeyPair ?? keyPair([1], [2]),
		);
		await first.saveLocalRegistrationId(4242);
		await first.storePreKey(7, keyPair([33, 34], [35, 36]));
		await first.storeSignedPreKey(9, keyPair([37, 38], [39, 40]));
		await first.saveIdentity(BOB_ADDRESS, bytes(41, 42, 43));
		await first.storeSession(BOB_ADDRESS, "session-record");

		const secondWrapper = new EncryptedOmemoPersistence(ACCOUNT, raw);
		await secondWrapper.unlock(PASSPHRASE);
		const second = new OmemoKeyStore(ACCOUNT, secondWrapper);
		await second.load();

		expect(await second.getLocalRegistrationId()).toBe(4242);
		expectBytes(
			(await second.getIdentityKeyPair())?.pubKey,
			bytes(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16),
		);
		expectBytes((await second.loadPreKey(7))?.keyPair.privKey, bytes(35, 36));
		expectBytes(
			(await second.loadSignedPreKey(9))?.keyPair.pubKey,
			bytes(37, 38),
		);
		expectBytes(await second.loadIdentityKey(BOB_ADDRESS), bytes(41, 42, 43));
		expect(await second.loadSession(BOB_ADDRESS)).toBe("session-record");
	});

	it("rejects clearly when IndexedDB is unavailable", async () => {
		vi.stubGlobal("indexedDB", undefined);
		const persistence = new IndexedDbOmemoPersistence();

		await expect(persistence.loadEnvelope(ACCOUNT)).rejects.toThrow(
			"IndexedDB is not available",
		);
	});

	it("rejects clearly when Web Crypto is unavailable", async () => {
		vi.stubGlobal("crypto", undefined);
		const persistence = new EncryptedOmemoPersistence(
			ACCOUNT,
			new MemoryOmemoEnvelopePersistence(),
		);

		await expect(persistence.unlock(PASSPHRASE)).rejects.toMatchObject({
			code: "crypto-unavailable",
		});
	});
});
