import type {
	OmemoEnvelope,
	OmemoEnvelopePersistence,
	OmemoPersistedState,
	OmemoPersistence,
} from "#/types/omemo";

/**
 * In-memory OMEMO persistence for tests and local harnesses.
 *
 * Values are cloned on the way in and out so callers cannot mutate stored state
 * through a shared reference, mirroring IndexedDB's structured-clone boundary.
 */
export class MemoryOmemoPersistence implements OmemoPersistence {
	private readonly accounts: Map<string, OmemoPersistedState>;

	/**
	 * @param initial Optional persisted state keyed by account JID.
	 */
	constructor(initial: Record<string, OmemoPersistedState> = {}) {
		this.accounts = new Map();
		for (const [accountJid, state] of Object.entries(initial)) {
			this.accounts.set(accountJid, structuredClone(state));
		}
	}

	async load(accountJid: string): Promise<OmemoPersistedState | null> {
		const state = this.accounts.get(accountJid);
		return state ? structuredClone(state) : null;
	}

	async save(accountJid: string, state: OmemoPersistedState): Promise<void> {
		this.accounts.set(accountJid, structuredClone(state));
	}

	async clear(accountJid: string): Promise<void> {
		this.accounts.delete(accountJid);
	}
}

export function createMemoryOmemoPersistence(
	initial: Record<string, OmemoPersistedState> = {},
): MemoryOmemoPersistence {
	return new MemoryOmemoPersistence(initial);
}

/**
 * In-memory envelope persistence for encrypted-persistence tests.
 *
 * Envelopes are cloned on the way in and out. `getEnvelope` also returns a
 * clone, so tests can inspect or deliberately tamper with an envelope without
 * mutating the stored record by reference.
 */
export class MemoryOmemoEnvelopePersistence
	implements OmemoEnvelopePersistence
{
	private readonly accounts: Map<string, OmemoEnvelope>;

	constructor(initial: Record<string, OmemoEnvelope> = {}) {
		this.accounts = new Map();
		for (const [accountJid, envelope] of Object.entries(initial)) {
			this.accounts.set(accountJid, structuredClone(envelope));
		}
	}

	async loadEnvelope(accountJid: string): Promise<OmemoEnvelope | null> {
		const envelope = this.accounts.get(accountJid);
		return envelope ? structuredClone(envelope) : null;
	}

	async saveEnvelope(
		accountJid: string,
		envelope: OmemoEnvelope,
	): Promise<void> {
		this.accounts.set(accountJid, structuredClone(envelope));
	}

	async clear(accountJid: string): Promise<void> {
		this.accounts.delete(accountJid);
	}

	getEnvelope(accountJid: string): OmemoEnvelope | null {
		const envelope = this.accounts.get(accountJid);
		return envelope ? structuredClone(envelope) : null;
	}
}
