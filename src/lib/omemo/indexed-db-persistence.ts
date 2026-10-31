import { requestResult, transactionDone } from "#/lib/storage/indexed-db";
import type { OmemoEnvelope, OmemoEnvelopePersistence } from "#/types/omemo";

const DATABASE_NAME = "avio-omemo";
const DATABASE_VERSION = 2;
const STORE_NAME = "encrypted-accounts";
const LEGACY_STORE_NAME = "accounts";

interface OmemoEnvelopeRecord {
	accountJid: string;
	envelope: OmemoEnvelope;
}

/**
 * Native IndexedDB storage for encrypted OMEMO envelopes.
 *
 * One envelope per account JID in the `avio-omemo` database. The adapter only
 * ever sees ciphertext; plaintext state is handled by
 * `EncryptedOmemoPersistence`.
 *
 * Version 2 deletes the legacy `accounts` object store so unencrypted records
 * from the earlier development slice cannot remain on disk.
 */
export class IndexedDbOmemoPersistence implements OmemoEnvelopePersistence {
	private database: Promise<IDBDatabase> | null = null;

	private openDatabase(): Promise<IDBDatabase> {
		if (typeof indexedDB === "undefined") {
			return Promise.reject(
				new Error(
					"IndexedDB is not available in this environment; cannot persist OMEMO keys",
				),
			);
		}
		if (this.database) return this.database;

		const opening = new Promise<IDBDatabase>((resolve, reject) => {
			const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
			request.onupgradeneeded = () => {
				const database = request.result;
				if (database.objectStoreNames.contains(LEGACY_STORE_NAME)) {
					database.deleteObjectStore(LEGACY_STORE_NAME);
				}
				if (!database.objectStoreNames.contains(STORE_NAME)) {
					database.createObjectStore(STORE_NAME, {
						keyPath: "accountJid",
					});
				}
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () =>
				reject(request.error ?? new Error("Failed to open the OMEMO database"));
			request.onblocked = () =>
				reject(new Error("Opening the OMEMO database was blocked"));
		});

		this.database = opening;
		opening.catch(() => {
			if (this.database === opening) this.database = null;
		});
		return opening;
	}

	async loadEnvelope(accountJid: string): Promise<OmemoEnvelope | null> {
		const database = await this.openDatabase();
		const transaction = database.transaction(STORE_NAME, "readonly");
		const record = await requestResult<OmemoEnvelopeRecord | undefined>(
			transaction.objectStore(STORE_NAME).get(accountJid),
		);
		return record?.envelope ?? null;
	}

	async saveEnvelope(
		accountJid: string,
		envelope: OmemoEnvelope,
	): Promise<void> {
		const database = await this.openDatabase();
		const transaction = database.transaction(STORE_NAME, "readwrite");
		transaction.objectStore(STORE_NAME).put({ accountJid, envelope });
		await transactionDone(transaction);
	}

	async clear(accountJid: string): Promise<void> {
		const database = await this.openDatabase();
		const transaction = database.transaction(STORE_NAME, "readwrite");
		transaction.objectStore(STORE_NAME).delete(accountJid);
		await transactionDone(transaction);
	}
}
