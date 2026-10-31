import type { MessageReceiptStore, StoredReceiptStatus } from "#/types/storage";

const STORAGE_KEY = "avio.message-receipts.v1";
const MAX_PER_ACCOUNT = 800;

const RANK: Record<StoredReceiptStatus, number> = {
	delivered: 1,
	read: 2,
};

type StoredAccounts = Record<string, Record<string, StoredReceiptStatus>>;

function isReceiptStatus(value: unknown): value is StoredReceiptStatus {
	return value === "delivered" || value === "read";
}

function parse(raw: string | null): StoredAccounts {
	if (!raw) return {};
	try {
		const parsed: unknown = JSON.parse(raw);
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			Array.isArray(parsed)
		) {
			return {};
		}
		const accounts: StoredAccounts = {};
		for (const [accountJid, values] of Object.entries(parsed)) {
			if (
				typeof values !== "object" ||
				values === null ||
				Array.isArray(values)
			) {
				continue;
			}
			const receipts: Record<string, StoredReceiptStatus> = {};
			for (const [messageId, status] of Object.entries(values)) {
				if (isReceiptStatus(status)) receipts[messageId] = status;
			}
			if (Object.keys(receipts).length > 0) accounts[accountJid] = receipts;
		}
		return accounts;
	} catch {
		return {};
	}
}

/** True when `next` should replace `current` (read never downgrades to delivered). */
export function receiptUpgrades(
	current: StoredReceiptStatus | undefined,
	next: StoredReceiptStatus,
): boolean {
	return current === undefined || RANK[next] > (RANK[current] ?? 0);
}

/** Applies stored receipts to replayed messages without downgrading later states. */
export function applyStoredReceipts<
	T extends { id: string; stanzaId?: string; status: string },
>(messages: T[], receipts: Record<string, StoredReceiptStatus>): T[] {
	let changed = false;
	const next = messages.map((message) => {
		const key = message.stanzaId ?? message.id;
		const stored = receipts[key];
		if (
			!stored ||
			!receiptUpgrades(message.status as StoredReceiptStatus, stored)
		) {
			return message;
		}
		changed = true;
		return { ...message, status: stored };
	});
	return changed ? next : messages;
}

/** Per-account read/delivery state for messages this client sent. */
export function createMessageReceiptStore(
	storage: Storage | null = typeof window === "undefined"
		? null
		: window.localStorage,
): MessageReceiptStore {
	function read(): StoredAccounts {
		try {
			return parse(storage?.getItem(STORAGE_KEY) ?? null);
		} catch {
			return {};
		}
	}

	function write(accounts: StoredAccounts): void {
		try {
			storage?.setItem(STORAGE_KEY, JSON.stringify(accounts));
		} catch {
			// Best effort: the in-memory status still shows this session.
		}
	}

	return {
		load(accountJid) {
			return { ...(read()[accountJid] ?? {}) };
		},
		save(accountJid, messageId, status) {
			const accounts = read();
			const current = accounts[accountJid]?.[messageId];
			if (!receiptUpgrades(current, status)) return;

			const receipts = { ...(accounts[accountJid] ?? {}), [messageId]: status };
			// Keep the newest entries; insertion order is receipt arrival order.
			const keys = Object.keys(receipts);
			for (const stale of keys.slice(
				0,
				Math.max(0, keys.length - MAX_PER_ACCOUNT),
			)) {
				delete receipts[stale];
			}
			write({ ...accounts, [accountJid]: receipts });
		},
	};
}

/** In-memory store for tests. */
export function createMemoryMessageReceiptStore(): MessageReceiptStore {
	const accounts = new Map<string, Record<string, StoredReceiptStatus>>();
	return {
		load: (accountJid) => ({ ...(accounts.get(accountJid) ?? {}) }),
		save(accountJid, messageId, status) {
			const current = accounts.get(accountJid) ?? {};
			if (!receiptUpgrades(current[messageId], status)) return;
			accounts.set(accountJid, { ...current, [messageId]: status });
		},
	};
}
