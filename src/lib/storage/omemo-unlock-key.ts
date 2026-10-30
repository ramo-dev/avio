import { requestResult, transactionDone } from "#/lib/storage/indexed-db";
import type { OmemoUnlockSecret } from "#/types/omemo";
import type { OmemoUnlockStore } from "#/types/storage";

const DATABASE_NAME = "avio-omemo-unlock";
const DATABASE_VERSION = 1;
const STORE_NAME = "secrets";
const OPERATION_TIMEOUT_MS = 5_000;
const LEGACY_PASSPHRASE_PREFIX = "avio.omemo.passphrase.v1:";

interface UnlockRecord {
	accountJid: string;
	secret: OmemoUnlockSecret;
	savedAt: number;
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
	if (typeof indexedDB === "undefined") {
		return Promise.reject(new Error("IndexedDB is not available"));
	}
	if (databasePromise) return databasePromise;

	const opening = new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
		request.onupgradeneeded = () => {
			const database = request.result;
			if (!database.objectStoreNames.contains(STORE_NAME)) {
				database.createObjectStore(STORE_NAME, { keyPath: "accountJid" });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () =>
			reject(request.error ?? new Error("Failed to open the unlock database"));
		request.onblocked = () =>
			reject(new Error("Opening the unlock database was blocked"));
	});

	databasePromise = opening;
	opening.catch(() => {
		if (databasePromise === opening) databasePromise = null;
	});
	return opening;
}

/** Fails slow IndexedDB calls so a stalled store cannot block unlock. */
function withTimeout<T>(operation: Promise<T>): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(
			() => reject(new Error("The unlock store timed out")),
			OPERATION_TIMEOUT_MS,
		);
	});
	return Promise.race([operation, timeout]).finally(() => clearTimeout(timer));
}

function isUnlockRecord(
	value: unknown,
	accountJid: string,
): value is UnlockRecord {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Partial<UnlockRecord>;
	if (record.accountJid !== accountJid) return false;
	const secret = record.secret;
	if (secret?.type !== "key") return false;
	const key = secret.key as Partial<CryptoKey> | undefined;
	return (
		typeof key === "object" &&
		key !== null &&
		key.type === "secret" &&
		key.extractable === false
	);
}

async function readRecord(accountJid: string): Promise<unknown> {
	const database = await openDatabase();
	const transaction = database.transaction(STORE_NAME, "readonly");
	return requestResult<unknown>(
		transaction.objectStore(STORE_NAME).get(accountJid),
	);
}

async function writeRecord(record: UnlockRecord): Promise<void> {
	const database = await openDatabase();
	const transaction = database.transaction(STORE_NAME, "readwrite");
	transaction.objectStore(STORE_NAME).put(record);
	await transactionDone(transaction);
}

async function deleteRecord(accountJid: string): Promise<void> {
	const database = await openDatabase();
	const transaction = database.transaction(STORE_NAME, "readwrite");
	transaction.objectStore(STORE_NAME).delete(accountJid);
	await transactionDone(transaction);
}

/**
 * Removes passphrase copies that earlier builds kept in browser storage.
 * Exported for tests; the store calls it through `clearLegacyPassphrases`.
 */
export function removeLegacyPassphrases(storage: Storage): void {
	const keys: string[] = [];
	for (let index = 0; index < storage.length; index += 1) {
		const key = storage.key(index);
		if (key?.startsWith(LEGACY_PASSPHRASE_PREFIX)) keys.push(key);
	}
	for (const key of keys) storage.removeItem(key);
}

/**
 * Device-local storage for the remembered unlock key.
 *
 * Holds one non-extractable AES-GCM key per account in IndexedDB. The
 * passphrase is never written here. Browser storage APIs only ever see the
 * key handle, which cannot be exported as bytes.
 */
export function createOmemoUnlockStore(): OmemoUnlockStore {
	return {
		async load(accountJid) {
			const record = await withTimeout(readRecord(accountJid));
			if (record === undefined) return null;
			if (!isUnlockRecord(record, accountJid)) {
				await withTimeout(deleteRecord(accountJid));
				return null;
			}
			return record.secret;
		},
		async save(accountJid, secret) {
			await withTimeout(
				writeRecord({ accountJid, secret, savedAt: Date.now() }),
			);
		},
		async clear(accountJid) {
			await withTimeout(deleteRecord(accountJid));
		},
		clearLegacyPassphrases() {
			if (typeof window === "undefined") return;
			for (const storage of [window.localStorage, window.sessionStorage]) {
				try {
					removeLegacyPassphrases(storage);
				} catch {
					// Storage can be disabled by the browser. Nothing was written there.
				}
			}
		},
	};
}

/** In-memory unlock store for tests. Never used by the app. */
export function createMemoryOmemoUnlockStore(): OmemoUnlockStore {
	const records = new Map<string, UnlockRecord>();
	return {
		async load(accountJid) {
			const record = records.get(accountJid);
			return record && isUnlockRecord(record, accountJid)
				? record.secret
				: null;
		},
		async save(accountJid, secret) {
			records.set(accountJid, { accountJid, secret, savedAt: Date.now() });
		},
		async clear(accountJid) {
			records.delete(accountJid);
		},
		clearLegacyPassphrases() {},
	};
}
