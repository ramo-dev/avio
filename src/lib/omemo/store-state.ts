import type { OmemoKeyPair, OmemoPersistedState } from "#/types/omemo";

export function createStoreMap(): Record<string, unknown> {
	return Object.create(null);
}

export function createEmptyState(): OmemoPersistedState {
	return {
		identityKeyPair: null,
		registrationId: null,
		preKeys: {},
		signedPreKeys: {},
		sessions: {},
		identities: {},
	};
}

export function cloneKeyPair(keyPair: OmemoKeyPair): OmemoKeyPair {
	return {
		pubKey: keyPair.pubKey.slice(0),
		privKey: keyPair.privKey.slice(0),
	};
}

export function cloneState(state: OmemoPersistedState): OmemoPersistedState {
	const preKeys: Record<string, OmemoKeyPair> = {};
	for (const [keyId, keyPair] of Object.entries(state.preKeys)) {
		preKeys[keyId] = cloneKeyPair(keyPair);
	}

	const signedPreKeys: Record<string, OmemoKeyPair> = {};
	for (const [keyId, keyPair] of Object.entries(state.signedPreKeys)) {
		signedPreKeys[keyId] = cloneKeyPair(keyPair);
	}

	const identities: Record<string, ArrayBuffer> = {};
	for (const [address, identityKey] of Object.entries(state.identities)) {
		identities[address] = identityKey.slice(0);
	}

	return {
		identityKeyPair: state.identityKeyPair
			? cloneKeyPair(state.identityKeyPair)
			: null,
		registrationId: state.registrationId,
		preKeys,
		signedPreKeys,
		sessions: { ...state.sessions },
		identities,
	};
}

export function equalBytes(left: ArrayBuffer, right: ArrayBuffer): boolean {
	if (left.byteLength !== right.byteLength) return false;
	const leftBytes = new Uint8Array(left);
	const rightBytes = new Uint8Array(right);
	for (let index = 0; index < leftBytes.length; index += 1) {
		if (leftBytes[index] !== rightBytes[index]) return false;
	}
	return true;
}

/**
 * Extracts the bare JID from an OMEMO address (`name.deviceId`).
 *
 * Device IDs are always the final numeric segment, so a bare JID that is only
 * a prefix of another JID can never match.
 */
export function addressJid(address: string): string | null {
	const separator = address.lastIndexOf(".");
	if (separator <= 0) return null;
	const deviceId = address.slice(separator + 1);
	if (!/^\d+$/.test(deviceId)) return null;
	return address.slice(0, separator);
}
