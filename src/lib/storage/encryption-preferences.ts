import type { EncryptionPreference } from "#/types/omemo";

const STORAGE_KEY = "avio.encryption.preferences.v1";

export interface EncryptionPreferenceStore {
	load(accountJid: string): Record<string, EncryptionPreference>;
	save(accountJid: string, jid: string, preference: EncryptionPreference): void;
}

type StoredPreferences = Record<string, EncryptionPreference>;
type StoredAccounts = Record<string, StoredPreferences>;

function parseAccounts(raw: string | null): StoredAccounts {
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
			const preferences: StoredPreferences = {};
			for (const [jid, value] of Object.entries(values)) {
				if (value === "on" || value === "off") preferences[jid] = value;
			}
			if (Object.keys(preferences).length > 0) {
				accounts[accountJid] = preferences;
			}
		}
		return accounts;
	} catch {
		return {};
	}
}

/** Per-account, per-chat encryption choices (`on`/`off` overrides). */
export function createEncryptionPreferenceStore(
	storage: Storage | null = typeof window === "undefined"
		? null
		: window.localStorage,
): EncryptionPreferenceStore {
	function read(): StoredAccounts {
		try {
			return parseAccounts(storage?.getItem(STORAGE_KEY) ?? null);
		} catch {
			return {};
		}
	}

	function write(accounts: StoredAccounts): void {
		try {
			storage?.setItem(STORAGE_KEY, JSON.stringify(accounts));
		} catch {
			// Storage disabled or full: the in-memory choice still applies.
		}
	}

	return {
		load(accountJid) {
			return { ...(read()[accountJid] ?? {}) };
		},
		save(accountJid, jid, preference) {
			const accounts = read();
			accounts[accountJid] = {
				...(accounts[accountJid] ?? {}),
				[jid]: preference,
			};
			write(accounts);
		},
	};
}

/** In-memory store for tests. */
export function createMemoryEncryptionPreferenceStore(): EncryptionPreferenceStore {
	const accounts = new Map<string, StoredPreferences>();
	return {
		load: (accountJid) => ({ ...(accounts.get(accountJid) ?? {}) }),
		save(accountJid, jid, preference) {
			accounts.set(accountJid, {
				...(accounts.get(accountJid) ?? {}),
				[jid]: preference,
			});
		},
	};
}
