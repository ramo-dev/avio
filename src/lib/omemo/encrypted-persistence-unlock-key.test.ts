// @vitest-environment node

import { describe, expect, it } from "vitest";
import { EncryptedOmemoPersistence } from "#/lib/omemo/encrypted-persistence";
import {
	ACCOUNT,
	createUnlocked,
	expectFixtureState,
	fixtureState,
	OTHER_ACCOUNT,
	PASSPHRASE,
	WRONG_PASSPHRASE,
} from "#/lib/omemo/encrypted-persistence.fixtures";
import { MemoryOmemoEnvelopePersistence } from "#/lib/omemo/memory-persistence";

describe("EncryptedOmemoPersistence remembered key", {
	timeout: 20_000,
}, () => {
	it("unlocks with the derived key and never needs the passphrase", async () => {
		const raw = new MemoryOmemoEnvelopePersistence();
		const first = new EncryptedOmemoPersistence(ACCOUNT, raw);
		const key = await first.unlock(PASSPHRASE);
		await first.save(ACCOUNT, fixtureState());
		expect(key.extractable).toBe(false);

		const second = new EncryptedOmemoPersistence(ACCOUNT, raw);
		await second.unlockWithKey(key);

		expect(second.isUnlocked).toBe(true);
		expectFixtureState(await second.load(ACCOUNT));
	});

	it("rejects a key that does not authenticate the stored envelope", async () => {
		const raw = new MemoryOmemoEnvelopePersistence();
		const first = await createUnlocked(raw);
		await first.save(ACCOUNT, fixtureState());
		const wrongKey = await new EncryptedOmemoPersistence(
			ACCOUNT,
			new MemoryOmemoEnvelopePersistence(),
		).unlock(WRONG_PASSPHRASE);

		const intruder = new EncryptedOmemoPersistence(ACCOUNT, raw);
		await expect(intruder.unlockWithKey(wrongKey)).rejects.toMatchObject({
			code: "invalid-passphrase",
		});
		expect(intruder.isUnlocked).toBe(false);
	});

	it("rejects a remembered key replayed onto another account", async () => {
		const raw = new MemoryOmemoEnvelopePersistence();
		const original = new EncryptedOmemoPersistence(ACCOUNT, raw);
		const key = await original.unlock(PASSPHRASE);
		await original.save(ACCOUNT, fixtureState());
		const envelope = raw.getEnvelope(ACCOUNT);
		if (!envelope) throw new Error("Expected a stored envelope");
		await raw.saveEnvelope(OTHER_ACCOUNT, envelope);

		const other = new EncryptedOmemoPersistence(OTHER_ACCOUNT, raw);
		await expect(other.unlockWithKey(key)).rejects.toMatchObject({
			code: "invalid-passphrase",
		});
	});

	it("rejects extractable keys and reports a missing envelope", async () => {
		const raw = new MemoryOmemoEnvelopePersistence();
		const first = await createUnlocked(raw);
		await first.save(ACCOUNT, fixtureState());
		const extractable = await crypto.subtle.generateKey(
			{ name: "AES-GCM", length: 256 },
			true,
			["encrypt", "decrypt"],
		);

		const intruder = new EncryptedOmemoPersistence(ACCOUNT, raw);
		await expect(intruder.unlockWithKey(extractable)).rejects.toMatchObject({
			code: "invalid-passphrase",
		});

		const empty = new EncryptedOmemoPersistence(
			ACCOUNT,
			new MemoryOmemoEnvelopePersistence(),
		);
		const key = await new EncryptedOmemoPersistence(
			ACCOUNT,
			new MemoryOmemoEnvelopePersistence(),
		).unlock(PASSPHRASE);
		await expect(empty.unlockWithKey(key)).rejects.toMatchObject({
			code: "not-configured",
		});
	});
});
