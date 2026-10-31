import type { OmemoKeyPair, OmemoPersistedState } from "#/types/omemo";

export function createStoreMap(): Record<string, unknown> {
	return Object.create(null);
}

export function createEmptyState(): OmemoPersistedState {
	return {
		identityKeyPair: null,
		registrationId: null,
		deviceId: null,
		currentSignedPreKeyId: null,
		preKeys: {},
		signedPreKeys: {},
		signedPreKeySignatures: {},
		sessions: {},
		identities: {},
		trustedIdentities: {},
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

	const signedPreKeySignatures = cloneBytesRecord(state.signedPreKeySignatures);
	const identities = cloneBytesRecord(state.identities);
	const trustedIdentities = cloneBytesRecord(state.trustedIdentities);

	return {
		identityKeyPair: state.identityKeyPair
			? cloneKeyPair(state.identityKeyPair)
			: null,
		registrationId: state.registrationId,
		deviceId: state.deviceId,
		currentSignedPreKeyId: state.currentSignedPreKeyId,
		preKeys,
		signedPreKeys,
		signedPreKeySignatures,
		sessions: { ...state.sessions },
		identities,
		trustedIdentities,
	};
}

function cloneBytesRecord(
	record: Record<string, ArrayBuffer>,
): Record<string, ArrayBuffer> {
	const result: Record<string, ArrayBuffer> = {};
	for (const [key, value] of Object.entries(record)) {
		result[key] = value.slice(0);
	}
	return result;
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
