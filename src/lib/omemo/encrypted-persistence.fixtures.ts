import { expect } from "vitest";
import { decodeBase64, encodeBase64 } from "#/lib/omemo/base64";
import { EncryptedOmemoPersistence } from "#/lib/omemo/encrypted-persistence";
import type { MemoryOmemoEnvelopePersistence } from "#/lib/omemo/memory-persistence";
import type { OmemoKeyPair, OmemoPersistedState } from "#/types/omemo";

export const ACCOUNT = "alice@example.com";
export const OTHER_ACCOUNT = "bob@example.com";
export const BOB_ADDRESS = "bob@example.com.1";
export const PASSPHRASE = "correct horse battery staple";
export const WRONG_PASSPHRASE = "incorrect horse battery staple";

export function bytes(...values: number[]): ArrayBuffer {
	return Uint8Array.from(values).buffer;
}

export const sequence = (start: number, length: number): ArrayBuffer =>
	bytes(...Array.from({ length }, (_, index) => start + index));

export function keyPair(pub: number[], priv: number[]): OmemoKeyPair {
	return { pubKey: bytes(...pub), privKey: bytes(...priv) };
}

export function expectBytes(
	actual: ArrayBuffer | undefined,
	expected: ArrayBuffer,
) {
	if (!actual) throw new Error("Expected key bytes to be present");
	expect(new Uint8Array(actual)).toEqual(new Uint8Array(expected));
}

export function fixtureState(): OmemoPersistedState {
	return {
		identityKeyPair: {
			pubKey: sequence(1, 16),
			privKey: sequence(17, 16),
		},
		registrationId: 4242,
		deviceId: 5150,
		currentSignedPreKeyId: 9,
		preKeys: { "7": keyPair([33, 34], [35, 36]) },
		signedPreKeys: { "9": keyPair([37, 38], [39, 40]) },
		signedPreKeySignatures: { "9": bytes(44, 45) },
		sessions: { [BOB_ADDRESS]: "session-record" },
		identities: { [BOB_ADDRESS]: bytes(41, 42, 43) },
		trustedIdentities: { [BOB_ADDRESS]: bytes(46, 47) },
	};
}

export function expectFixtureState(state: OmemoPersistedState | null): void {
	if (!state) throw new Error("Expected persisted state to be present");
	expectBytes(state.identityKeyPair?.pubKey, sequence(1, 16));
	expectBytes(state.identityKeyPair?.privKey, sequence(17, 16));
	expect(state.registrationId).toBe(4242);
	expect(state.deviceId).toBe(5150);
	expect(state.currentSignedPreKeyId).toBe(9);
	expectBytes(state.preKeys["7"]?.pubKey, bytes(33, 34));
	expectBytes(state.preKeys["7"]?.privKey, bytes(35, 36));
	expectBytes(state.signedPreKeys["9"]?.pubKey, bytes(37, 38));
	expectBytes(state.signedPreKeys["9"]?.privKey, bytes(39, 40));
	expectBytes(state.signedPreKeySignatures["9"], bytes(44, 45));
	expect(state.sessions[BOB_ADDRESS]).toBe("session-record");
	expectBytes(state.identities[BOB_ADDRESS], bytes(41, 42, 43));
	expectBytes(state.trustedIdentities[BOB_ADDRESS], bytes(46, 47));
}

export function tamperCiphertext(value: string): string {
	const decoded = decodeBase64(value);
	if (!decoded) throw new Error("Expected valid base64 ciphertext");
	decoded[0] ^= 0xff;
	return encodeBase64(decoded);
}

export async function createUnlocked(
	raw: MemoryOmemoEnvelopePersistence,
): Promise<EncryptedOmemoPersistence> {
	const persistence = new EncryptedOmemoPersistence(ACCOUNT, raw);
	await persistence.unlock(PASSPHRASE);
	return persistence;
}
