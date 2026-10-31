import type { Direction, KeyId, OMEMOStore } from "libomemo.js";
import { OmemoStoreBase } from "#/lib/omemo/store-base";
import { addressJid, cloneKeyPair, equalBytes } from "#/lib/omemo/store-state";
import type { OmemoKeyPair } from "#/types/omemo";

/** A stored pre-key in numeric-ID order, as needed for bundle assembly. */
export interface OmemoStoredPreKey {
	id: number;
	keyPair: OmemoKeyPair;
}

/**
 * Persistence-agnostic OMEMO key store implementing libomemo.js `OMEMOStore`.
 *
 * Identity, pre-key, session, and trust methods hydrate from `OmemoPersistence`
 * and persist after every mutation. All reads return defensive copies.
 *
 * Call `load()` before using the store. Every other asynchronous method also
 * awaits hydration defensively, so a missed call cannot silently operate on an
 * empty state.
 */
export class OmemoKeyStore extends OmemoStoreBase implements OMEMOStore {
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

	async getDeviceId(): Promise<number | undefined> {
		await this.load();
		return this.state.deviceId ?? undefined;
	}

	async saveDeviceId(deviceId: number): Promise<void> {
		await this.load();
		this.state.deviceId = deviceId;
		await this.persist();
	}

	async getCurrentSignedPreKeyId(): Promise<number | undefined> {
		await this.load();
		return this.state.currentSignedPreKeyId ?? undefined;
	}

	async saveCurrentSignedPreKeyId(keyId: number): Promise<void> {
		await this.load();
		this.state.currentSignedPreKeyId = keyId;
		await this.persist();
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

	async saveTrustedIdentity(
		address: string,
		identityKey: ArrayBuffer,
	): Promise<void> {
		await this.load();
		this.state.trustedIdentities[address] = identityKey.slice(0);
		await this.persist();
	}

	async loadTrustedIdentity(address: string): Promise<ArrayBuffer | undefined> {
		await this.load();
		return this.state.trustedIdentities[address]?.slice(0);
	}

	async removeTrustedIdentity(address: string): Promise<void> {
		await this.load();
		if (!Object.hasOwn(this.state.trustedIdentities, address)) return;
		delete this.state.trustedIdentities[address];
		await this.persist();
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

	async listPreKeyIds(): Promise<number[]> {
		await this.load();
		return Object.keys(this.state.preKeys)
			.map((keyId) => Number(keyId))
			.filter((keyId) => Number.isInteger(keyId))
			.sort((left, right) => left - right);
	}

	async listPreKeys(): Promise<OmemoStoredPreKey[]> {
		await this.load();
		const preKeys: OmemoStoredPreKey[] = [];
		for (const id of await this.listPreKeyIds()) {
			const keyPair = this.state.preKeys[String(id)];
			if (keyPair) preKeys.push({ id, keyPair: cloneKeyPair(keyPair) });
		}
		return preKeys;
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
		delete this.state.signedPreKeySignatures[String(keyId)];
		await this.persist();
	}

	async loadSignedPreKeySignature(
		keyId: number,
	): Promise<ArrayBuffer | undefined> {
		await this.load();
		return this.state.signedPreKeySignatures[String(keyId)]?.slice(0);
	}

	async saveSignedPreKeySignature(
		keyId: number,
		signature: ArrayBuffer,
	): Promise<void> {
		await this.load();
		this.state.signedPreKeySignatures[String(keyId)] = signature.slice(0);
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
}
