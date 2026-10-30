import type { Direction, KeyId, OMEMOStore } from "libomemo.js";
import {
	addressJid,
	cloneKeyPair,
	cloneState,
	createEmptyState,
	createStoreMap,
	equalBytes,
} from "#/lib/omemo/store-state";
import type {
	OmemoKeyPair,
	OmemoPersistedState,
	OmemoPersistence,
} from "#/types/omemo";

/**
 * Persistence-agnostic OMEMO key store implementing libomemo.js `OMEMOStore`.
 *
 * libomemo.js mixes synchronous and asynchronous storage methods. The generic
 * `store`/`put`/`get`/`remove` surface is a synchronous in-memory map, while
 * identity, pre-key, and session methods hydrate from `OmemoPersistence` and
 * persist after every mutation.
 *
 * Call `load()` before using the store. Every other asynchronous method also
 * awaits hydration defensively, so a missed call cannot silently operate on an
 * empty state.
 */
export class OmemoKeyStore implements OMEMOStore {
	store: Record<string, unknown> = createStoreMap();
	private readonly accountJid: string;
	private readonly persistence: OmemoPersistence;
	private state: OmemoPersistedState = createEmptyState();
	private loaded = false;
	private loadPromise: Promise<void> | null = null;
	private saveChain: Promise<void> = Promise.resolve();
	private generation = 0;

	constructor(accountJid: string, persistence: OmemoPersistence) {
		this.accountJid = accountJid;
		this.persistence = persistence;
	}

	async load(): Promise<void> {
		if (this.loaded) return;
		this.loadPromise ??= this.hydrate();
		try {
			await this.loadPromise;
		} catch (error) {
			this.loadPromise = null;
			throw error;
		}
	}

	private async hydrate(): Promise<void> {
		const generation = this.generation;
		const persisted = await this.persistence.load(this.accountJid);
		if (generation !== this.generation) return;
		if (persisted) {
			this.state = cloneState(persisted);
		}
		this.loaded = true;
	}

	/**
	 * Stores the locally generated identity key pair. libomemo.js has no setter
	 * for this, so the engine uses this method after `KeyHelper` generates it.
	 */
	async saveIdentityKeyPair(keyPair: OmemoKeyPair): Promise<void> {
		await this.load();
		this.state.identityKeyPair = cloneKeyPair(keyPair);
		await this.persist();
	}

	/**
	 * Stores the locally generated registration ID. See `saveIdentityKeyPair`.
	 */
	async saveLocalRegistrationId(registrationId: number): Promise<void> {
		await this.load();
		this.state.registrationId = registrationId;
		await this.persist();
	}

	put(key: string, value: unknown): void {
		this.store[key] = value;
	}

	get<T = unknown>(key: string, defaultValue?: T): T | undefined {
		if (!Object.hasOwn(this.store, key)) return defaultValue;
		return this.store[key] as T;
	}

	remove(key: string): void {
		delete this.store[key];
	}

	async isTrustedIdentity(
		address: string,
		identityKey: ArrayBuffer,
		_direction: Direction,
	): Promise<boolean> {
		await this.load();
		const known = this.state.identities[address];
		return known === undefined || equalBytes(known, identityKey);
	}

	async loadIdentityKey(address: string): Promise<ArrayBuffer | undefined> {
		await this.load();
		return this.state.identities[address]?.slice(0);
	}

	async saveIdentity(
		address: string,
		identityKey: ArrayBuffer,
	): Promise<boolean> {
		await this.load();
		const known = this.state.identities[address];
		const changed = known !== undefined && !equalBytes(known, identityKey);
		this.state.identities[address] = identityKey.slice(0);
		await this.persist();
		return changed;
	}

	async loadPreKey(
		keyId: KeyId,
	): Promise<{ keyPair: OmemoKeyPair } | undefined> {
		await this.load();
		const keyPair = this.state.preKeys[String(keyId)];
		return keyPair ? { keyPair: cloneKeyPair(keyPair) } : undefined;
	}

	async storePreKey(keyId: KeyId, keyPair: OmemoKeyPair): Promise<void> {
		await this.load();
		this.state.preKeys[String(keyId)] = cloneKeyPair(keyPair);
		await this.persist();
	}

	async removePreKey(keyId: KeyId): Promise<void> {
		await this.load();
		delete this.state.preKeys[String(keyId)];
		await this.persist();
	}

	async loadSignedPreKey(
		keyId: number,
	): Promise<{ keyPair: OmemoKeyPair } | undefined> {
		await this.load();
		const keyPair = this.state.signedPreKeys[String(keyId)];
		return keyPair ? { keyPair: cloneKeyPair(keyPair) } : undefined;
	}

	async storeSignedPreKey(keyId: KeyId, keyPair: OmemoKeyPair): Promise<void> {
		await this.load();
		this.state.signedPreKeys[String(keyId)] = cloneKeyPair(keyPair);
		await this.persist();
	}

	async removeSignedPreKey(keyId: KeyId): Promise<void> {
		await this.load();
		delete this.state.signedPreKeys[String(keyId)];
		await this.persist();
	}

	async loadSession(address: string): Promise<string | undefined> {
		await this.load();
		return this.state.sessions[address];
	}

	async storeSession(address: string, record: string): Promise<void> {
		await this.load();
		this.state.sessions[address] = record;
		await this.persist();
	}

	async removeSession(address: string): Promise<void> {
		await this.load();
		delete this.state.sessions[address];
		await this.persist();
	}

	async removeAllSessions(jid: string): Promise<void> {
		await this.load();
		let removed = false;
		for (const address of Object.keys(this.state.sessions)) {
			if (addressJid(address) === jid) {
				delete this.state.sessions[address];
				removed = true;
			}
		}
		if (removed) await this.persist();
	}

	async getIdentityKeyPair(): Promise<OmemoKeyPair | undefined> {
		await this.load();
		return this.state.identityKeyPair
			? cloneKeyPair(this.state.identityKeyPair)
			: undefined;
	}

	async getLocalRegistrationId(): Promise<number | undefined> {
		await this.load();
		return this.state.registrationId ?? undefined;
	}

	async clear(): Promise<void> {
		this.generation += 1;
		this.state = createEmptyState();
		for (const key of Object.keys(this.store)) {
			delete this.store[key];
		}
		this.loaded = true;
		this.loadPromise = null;

		const clearing = this.saveChain.then(
			() => this.persistence.clear(this.accountJid),
			() => this.persistence.clear(this.accountJid),
		);
		this.saveChain = clearing.then(
			() => undefined,
			() => undefined,
		);
		await clearing;
	}

	private persist(): Promise<void> {
		const snapshot = cloneState(this.state);
		const write = this.saveChain.then(
			() => this.persistence.save(this.accountJid, snapshot),
			() => this.persistence.save(this.accountJid, snapshot),
		);
		this.saveChain = write.then(
			() => undefined,
			() => undefined,
		);
		return write;
	}
}
