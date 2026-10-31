import { describe, expect, it } from "vitest";
import {
	createEncryptionPreferenceStore,
	createMemoryEncryptionPreferenceStore,
} from "#/lib/storage/encryption-preferences";

const ALICE = "alice@example.com";
const BOB = "bob@example.com";

function memoryStorage(): Storage {
	const values = new Map<string, string>();
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

describe("encryption preference storage", () => {
	it("keeps on/off overrides per account and chat", () => {
		const storage = memoryStorage();
		const store = createEncryptionPreferenceStore(storage);
		store.save(ALICE, BOB, "off");
		store.save(ALICE, "carol@example.com", "on");
		store.save("other@example.com", BOB, "on");

		expect(createEncryptionPreferenceStore(storage).load(ALICE)).toEqual({
			[BOB]: "off",
			"carol@example.com": "on",
		});
		expect(store.load("other@example.com")).toEqual({ [BOB]: "on" });
	});

	it("overwrites an existing choice", () => {
		const store = createEncryptionPreferenceStore(memoryStorage());
		store.save(ALICE, BOB, "on");
		store.save(ALICE, BOB, "off");
		expect(store.load(ALICE)).toEqual({ [BOB]: "off" });
	});

	it("ignores malformed storage and invalid values", () => {
		const storage = memoryStorage();
		storage.setItem(
			"avio.encryption.preferences.v1",
			JSON.stringify({
				[ALICE]: { [BOB]: "maybe", "carol@example.com": "on" },
				broken: "nope",
			}),
		);
		expect(createEncryptionPreferenceStore(storage).load(ALICE)).toEqual({
			"carol@example.com": "on",
		});

		storage.setItem("avio.encryption.preferences.v1", "{not json");
		expect(createEncryptionPreferenceStore(storage).load(ALICE)).toEqual({});
	});

	it("survives unavailable storage", () => {
		const store = createEncryptionPreferenceStore(null);
		store.save(ALICE, BOB, "on");
		expect(store.load(ALICE)).toEqual({});
	});

	it("provides an isolated in-memory store", () => {
		const store = createMemoryEncryptionPreferenceStore();
		store.save(ALICE, BOB, "on");
		expect(store.load(ALICE)).toEqual({ [BOB]: "on" });
		expect(store.load("other@example.com")).toEqual({});
	});
});
