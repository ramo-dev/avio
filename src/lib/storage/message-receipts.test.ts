import { describe, expect, it } from "vitest";
import {
	applyStoredReceipts,
	createMemoryMessageReceiptStore,
	createMessageReceiptStore,
	receiptUpgrades,
} from "#/lib/storage/message-receipts";

const ALICE = "alice@example.com";

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

describe("message receipt storage", () => {
	it("keeps the newest state and never downgrades read to delivered", () => {
		const store = createMessageReceiptStore(memoryStorage());
		store.save(ALICE, "message-1", "delivered");
		store.save(ALICE, "message-1", "read");
		store.save(ALICE, "message-1", "delivered");
		expect(store.load(ALICE)).toEqual({ "message-1": "read" });
	});

	it("isolates accounts and ignores malformed data", () => {
		const storage = memoryStorage();
		const store = createMessageReceiptStore(storage);
		store.save(ALICE, "m1", "read");
		store.save("other@example.com", "m1", "delivered");
		expect(store.load(ALICE)).toEqual({ m1: "read" });
		expect(store.load("other@example.com")).toEqual({ m1: "delivered" });

		storage.setItem(
			"avio.message-receipts.v1",
			JSON.stringify({ [ALICE]: { bad: "maybe", ok: "read" } }),
		);
		expect(createMessageReceiptStore(storage).load(ALICE)).toEqual({
			ok: "read",
		});
		storage.setItem("avio.message-receipts.v1", "{oops");
		expect(createMessageReceiptStore(storage).load(ALICE)).toEqual({});
	});

	it("caps the number of stored receipts per account", () => {
		const store = createMessageReceiptStore(memoryStorage());
		for (let index = 0; index < 805; index += 1) {
			store.save(ALICE, `message-${index}`, "delivered");
		}
		const stored = store.load(ALICE);
		expect(Object.keys(stored)).toHaveLength(800);
		expect(stored["message-0"]).toBeUndefined();
		expect(stored["message-804"]).toBe("delivered");
	});

	it("upgrades replayed message status by stanza id or local id", () => {
		const messages = [
			{
				id: "local-1",
				stanzaId: "server-1",
				status: "sent",
				body: "hi",
			},
			{ id: "local-2", status: "sent", body: "there" },
		];
		const upgraded = applyStoredReceipts(messages, {
			"server-1": "read",
			"local-2": "delivered",
		});
		expect(upgraded.map((message) => message.status)).toEqual([
			"read",
			"delivered",
		]);
	});

	it("keeps a stronger status already on the message", () => {
		const messages = [{ id: "m1", status: "read" }];
		expect(applyStoredReceipts(messages, { m1: "delivered" })).toBe(messages);
		expect(receiptUpgrades("read", "delivered")).toBe(false);
	});

	it("provides an isolated in-memory store", () => {
		const store = createMemoryMessageReceiptStore();
		store.save(ALICE, "m1", "delivered");
		expect(store.load(ALICE)).toEqual({ m1: "delivered" });
		expect(store.load("other@example.com")).toEqual({});
	});
});
