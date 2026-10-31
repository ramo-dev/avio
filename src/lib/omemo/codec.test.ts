// @vitest-environment node

import { describe, expect, it } from "vitest";
import { decodeState, encodeState } from "#/lib/omemo/codec";
import { createEmptyState } from "#/lib/omemo/store-state";
import type { OmemoPersistedState } from "#/types/omemo";

function bytes(...values: number[]): ArrayBuffer {
	const buffer = new ArrayBuffer(values.length);
	new Uint8Array(buffer).set(values);
	return buffer;
}

function expectBytes(
	actual: ArrayBuffer | undefined,
	expected: ArrayBuffer,
): void {
	if (!actual) throw new Error("Expected key bytes to be present");
	expect(Array.from(new Uint8Array(actual))).toEqual(
		Array.from(new Uint8Array(expected)),
	);
}

describe("OMEMO state codec", () => {
	it("roundtrips device lifecycle and trust records", () => {
		const state: OmemoPersistedState = {
			...createEmptyState(),
			identityKeyPair: { pubKey: bytes(1), privKey: bytes(2) },
			registrationId: 5,
			deviceId: 42,
			currentSignedPreKeyId: 3,
			preKeys: { "3": { pubKey: bytes(4), privKey: bytes(5) } },
			signedPreKeySignatures: { "3": bytes(6, 7) },
			trustedIdentities: { "bob@example.com.1": bytes(8, 9) },
		};

		const decoded = decodeState(encodeState(state));

		expect(decoded.deviceId).toBe(42);
		expect(decoded.currentSignedPreKeyId).toBe(3);
		expectBytes(decoded.signedPreKeySignatures["3"], bytes(6, 7));
		expectBytes(decoded.trustedIdentities["bob@example.com.1"], bytes(8, 9));
	});

	it("defaults lifecycle fields missing from older envelopes", () => {
		const legacy = {
			identityKeyPair: null,
			registrationId: null,
			preKeys: {},
			signedPreKeys: {},
			sessions: {},
			identities: {},
		};

		const decoded = decodeState(
			new TextEncoder().encode(JSON.stringify(legacy)),
		);

		expect(decoded.deviceId).toBeNull();
		expect(decoded.currentSignedPreKeyId).toBeNull();
		expect(decoded.signedPreKeySignatures).toEqual({});
		expect(decoded.trustedIdentities).toEqual({});
	});
});
