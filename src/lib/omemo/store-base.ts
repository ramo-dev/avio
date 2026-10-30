import {
	cloneState,
	createEmptyState,
	createStoreMap,
} from "#/lib/omemo/store-state";
import type { OmemoPersistedState, OmemoPersistence } from "#/types/omemo";

/**
 * Shared persistence lifecycle and synchronous map for OMEMO stores.
 *
 * libomemo.js mixes a synchronous key-value map with asynchronous key storage.
 * This base owns hydration, serialized persistence writes, and reset behavior.
 * `OmemoKeyStore` adds the cryptographic key, session, and trust methods.
 */
export abstract class OmemoStoreBase {
	store: Record<string, unknown> = createStoreMap();
	protected state: OmemoPersistedState = createEmptyState();
	private readonly accountJid: string;
	private readonly persistence: OmemoPersistence;
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

	protected persist(): Promise<void> {
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

	private async hydrate(): Promise<void> {
		const generation = this.generation;
		const persisted = await this.persistence.load(this.accountJid);
		if (generation !== this.generation) return;
		if (persisted) {
			this.state = cloneState(persisted);
		}
		this.loaded = true;
	}
}
