import type { StoredSession } from "#/types/storage";
import type { SessionStore } from "#/types/store";

const STORAGE_KEY = "avio.session.v1";

export function createSessionStore(): SessionStore {
	let memory: StoredSession | null = null;

	function storage(): Storage | null {
		try {
			if (typeof window === "undefined") return null;
			return window.localStorage;
		} catch {
			return null;
		}
	}

	function load(): StoredSession | null {
		const store = storage();
		if (!store) return memory;
		try {
			const raw = store.getItem(STORAGE_KEY);
			if (!raw) return null;
			const parsed: unknown = JSON.parse(raw);
			if (!isStoredSession(parsed)) return null;
			return parsed;
		} catch {
			return null;
		}
	}

	function save(session: StoredSession) {
		memory = session;
		const store = storage();
		if (!store) return;
		try {
			store.setItem(STORAGE_KEY, JSON.stringify(session));
		} catch {
			// Storage can be unavailable in private browsing; keep the in-memory copy.
		}
	}

	function clear() {
		memory = null;
		const store = storage();
		if (!store) return;
		try {
			store.removeItem(STORAGE_KEY);
		} catch {
			// Ignore unavailable storage.
		}
	}

	return { load, save, clear };
}

export function createMemorySessionStore(
	initial: StoredSession | null = null,
): SessionStore {
	let session = initial;
	return {
		load: () => session,
		save: (next) => {
			session = next;
		},
		clear: () => {
			session = null;
		},
	};
}

function isStoredSession(value: unknown): value is StoredSession {
	return (
		typeof value === "object" &&
		value !== null &&
		"jid" in value &&
		typeof (value as StoredSession).jid === "string"
	);
}
