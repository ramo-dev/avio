import type { StoredSession } from "#/types/storage";
import type { SessionStore } from "#/types/store";

const STORAGE_KEY = "avio.session.v1";
// Tab-scoped password restore. This is cleared on logout and auth failure.
// It is never written to localStorage; Tauri will use the OS keychain instead.
const PASSWORD_KEY = "avio.session.password.v1";

export function createSessionStore(): SessionStore {
	let memory: StoredSession | null = null;
	let memoryPassword: string | null = null;

	function localStorage(): Storage | null {
		try {
			if (typeof window === "undefined") return null;
			return window.localStorage;
		} catch {
			return null;
		}
	}

	function sessionStorage(): Storage | null {
		try {
			if (typeof window === "undefined") return null;
			return window.sessionStorage;
		} catch {
			return null;
		}
	}

	function load(): StoredSession | null {
		const store = localStorage();
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
		const store = localStorage();
		if (!store) return;
		try {
			store.setItem(STORAGE_KEY, JSON.stringify(session));
		} catch {
			// Storage can be unavailable in private browsing; keep the in-memory copy.
		}
	}

	function loadPassword(): string | null {
		const store = sessionStorage();
		if (!store) return memoryPassword;
		try {
			return store.getItem(PASSWORD_KEY);
		} catch {
			return null;
		}
	}

	function savePassword(password: string) {
		memoryPassword = password;
		const store = sessionStorage();
		if (!store) return;
		try {
			store.setItem(PASSWORD_KEY, password);
		} catch {
			// Keep the in-memory copy if sessionStorage is unavailable.
		}
	}

	function clearPassword() {
		memoryPassword = null;
		const store = sessionStorage();
		if (!store) return;
		try {
			store.removeItem(PASSWORD_KEY);
		} catch {
			// Ignore unavailable storage.
		}
	}

	function clear() {
		memory = null;
		const store = localStorage();
		if (store) {
			try {
				store.removeItem(STORAGE_KEY);
			} catch {
				// Ignore unavailable storage.
			}
		}
		clearPassword();
	}

	return { load, save, loadPassword, savePassword, clearPassword, clear };
}

export function createMemorySessionStore(
	initial: StoredSession | null = null,
	initialPassword: string | null = null,
): SessionStore {
	let session = initial;
	let password = initialPassword;
	return {
		load: () => session,
		save: (next) => {
			session = next;
		},
		loadPassword: () => password,
		savePassword: (next) => {
			password = next;
		},
		clearPassword: () => {
			password = null;
		},
		clear: () => {
			session = null;
			password = null;
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
