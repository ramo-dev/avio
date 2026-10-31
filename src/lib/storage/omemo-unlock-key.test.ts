// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createMemoryOmemoUnlockStore,
	REMEMBERED_UNLOCK_TTL_MS,
	removeLegacyPassphrases,
} from "#/lib/storage/omemo-unlock-key";

const ALICE = "alice@example.com";
const BOB = "bob@example.com";

function fakeStorage(entries: Record<string, string>): Storage {
	const values = new Map(Object.entries(entries));
	return {
		get length() {
			return values.size;
		},
		key: (index: number) => [...values.keys()][index] ?? null,
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => {
			values.set(key, value);
		},
		removeItem: (key: string) => {
			values.delete(key);
		},
		clear: () => values.clear(),
	} as unknown as Storage;
}

async function generateKey(): Promise<CryptoKey> {
	return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
		"encrypt",
		"decrypt",
	]);
}

describe("createMemoryOmemoUnlockStore", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("saves, loads, and clears one unlock secret per account", async () => {
		const store = createMemoryOmemoUnlockStore();
		const key = await generateKey();

		await store.save(ALICE, { type: "key", key });

		expect(await store.load(ALICE)).toEqual({ type: "key", key });
		expect(await store.load(BOB)).toBeNull();

		await store.clear(ALICE);
		expect(await store.load(ALICE)).toBeNull();
	});

	it("expires a remembered key after the TTL", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
		const store = createMemoryOmemoUnlockStore();
		const key = await generateKey();
		await store.save(ALICE, { type: "key", key });
		expect(await store.load(ALICE)).toEqual({ type: "key", key });

		vi.setSystemTime(new Date(Date.now() + REMEMBERED_UNLOCK_TTL_MS + 1_000));
		expect(await store.load(ALICE)).toBeNull();
	});
});

describe("removeLegacyPassphrases", () => {
	it("removes only legacy OMEMO passphrase entries", () => {
		const storage = fakeStorage({
			[`avio.omemo.passphrase.v1:${ALICE}`]: "correct horse",
			"avio.settings.v1": "{}",
		});

		removeLegacyPassphrases(storage);

		expect(storage.getItem(`avio.omemo.passphrase.v1:${ALICE}`)).toBeNull();
		expect(storage.getItem("avio.settings.v1")).toBe("{}");
	});
});
