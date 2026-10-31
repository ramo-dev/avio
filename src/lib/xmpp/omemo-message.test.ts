// @vitest-environment node

import type * as StanzaProtocol from "stanza/protocol";
import { describe, expect, it } from "vitest";
import { decodeBase64, encodeBase64 } from "#/lib/omemo/base64";
import { OmemoMessageError } from "#/lib/omemo/errors";
import { fromStanzaOmemo, toStanzaOmemo } from "#/lib/xmpp/omemo-message";
import type { OmemoCipherKey, OmemoEncryptedMessage } from "#/types/omemo";

const IV_BYTES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const PRIMARY_VALUE = [10, 20, 30, 40, 50, 60];
const SECONDARY_VALUE = [70, 80, 90, 100, 110, 120, 130];
const PAYLOAD_BYTES = [200, 201, 202, 203, 204, 205];

const PRIMARY_KEY: OmemoCipherKey = {
	rid: 1234,
	preKey: true,
	value: encodeBase64(Uint8Array.from(PRIMARY_VALUE)),
};
const SECONDARY_KEY: OmemoCipherKey = {
	rid: 5678,
	preKey: false,
	value: encodeBase64(Uint8Array.from(SECONDARY_VALUE)),
};

const ENVELOPE: OmemoEncryptedMessage = {
	sid: 987_654,
	iv: encodeBase64(Uint8Array.from(IV_BYTES)),
	keys: [PRIMARY_KEY, SECONDARY_KEY],
	payload: encodeBase64(Uint8Array.from(PAYLOAD_BYTES)),
};

function asStanzaOmemo(value: unknown): StanzaProtocol.OMEMO {
	return value as StanzaProtocol.OMEMO;
}

function bytes(value: string): number[] {
	const decoded = decodeBase64(value);
	if (!decoded) throw new Error("Expected valid base64");
	return Array.from(decoded);
}

function expectInvalidEnvelope(run: () => unknown): void {
	try {
		run();
	} catch (error) {
		expect(error).toBeInstanceOf(OmemoMessageError);
		expect((error as OmemoMessageError).code).toBe("invalid-envelope");
		return;
	}
	throw new Error("Expected the envelope to be rejected");
}

describe("OMEMO message stanza codec", () => {
	it("round-trips an envelope with multiple keys and a prekey flag", () => {
		const stanza = toStanzaOmemo(ENVELOPE);

		expect(stanza.header.sid).toBe(ENVELOPE.sid);
		expect(Array.from(stanza.header.iv)).toEqual(IV_BYTES);

		const [primary, secondary] = stanza.header.keys;
		expect(stanza.header.keys).toHaveLength(2);
		expect(primary?.rid).toBe(PRIMARY_KEY.rid);
		expect(primary?.preKey).toBe(true);
		expect(Array.from(primary?.value ?? [])).toEqual(PRIMARY_VALUE);
		expect(secondary?.rid).toBe(SECONDARY_KEY.rid);
		expect(secondary?.preKey).toBe(false);
		expect(Array.from(secondary?.value ?? [])).toEqual(SECONDARY_VALUE);
		expect(Array.from(stanza.payload ?? [])).toEqual(PAYLOAD_BYTES);

		const restored = fromStanzaOmemo(stanza);

		expect(restored).toEqual(ENVELOPE);
		expect(bytes(restored.iv)).toEqual(IV_BYTES);
		expect(bytes(restored.keys[0]?.value ?? "")).toEqual(PRIMARY_VALUE);
		expect(bytes(restored.keys[1]?.value ?? "")).toEqual(SECONDARY_VALUE);
		expect(bytes(restored.payload)).toEqual(PAYLOAD_BYTES);
		expect(restored.keys[0]?.preKey).toBe(true);
		expect(restored.keys[1]?.preKey).toBe(false);
	});

	it("does not mutate the input envelope", () => {
		const snapshot = structuredClone(ENVELOPE);

		toStanzaOmemo(ENVELOPE);

		expect(ENVELOPE).toEqual(snapshot);
	});

	it("rejects malformed inbound envelopes", () => {
		const stanza = toStanzaOmemo(ENVELOPE);
		const header = stanza.header;

		const malformed: [string, unknown][] = [
			["missing header", { payload: stanza.payload }],
			[
				"missing keys",
				{ header: { sid: header.sid, iv: header.iv }, payload: stanza.payload },
			],
			[
				"empty keys",
				{ header: { ...header, keys: [] }, payload: stanza.payload },
			],
			[
				"missing iv",
				{
					header: { sid: header.sid, keys: header.keys },
					payload: stanza.payload,
				},
			],
			["missing payload", { header }],
			[
				"missing sid",
				{ header: { ...header, sid: undefined }, payload: stanza.payload },
			],
			[
				"invalid key id",
				{
					header: { ...header, keys: [{ ...PRIMARY_KEY, rid: 0 }] },
					payload: stanza.payload,
				},
			],
			[
				"duplicate key id",
				{
					header: { ...header, keys: [PRIMARY_KEY, PRIMARY_KEY] },
					payload: stanza.payload,
				},
			],
			[
				"non-buffer iv",
				{ header: { ...header, iv: "not-a-buffer" }, payload: stanza.payload },
			],
			["non-buffer payload", { header, payload: "not-a-buffer" }],
			[
				"missing key value",
				{
					header: { ...header, keys: [{ ...PRIMARY_KEY, value: undefined }] },
					payload: stanza.payload,
				},
			],
		];

		for (const [, value] of malformed) {
			expectInvalidEnvelope(() => fromStanzaOmemo(asStanzaOmemo(value)));
		}
	});

	it("rejects malformed outbound base64", () => {
		for (const envelope of [
			{ ...ENVELOPE, iv: "%%%not-base64%%%" },
			{ ...ENVELOPE, iv: "" },
			{ ...ENVELOPE, payload: "%%%not-base64%%%" },
			{ ...ENVELOPE, keys: [{ ...PRIMARY_KEY, value: "%%%" }] },
			{ ...ENVELOPE, keys: [] },
			{ ...ENVELOPE, sid: 0 },
		]) {
			expectInvalidEnvelope(() => toStanzaOmemo(envelope));
		}
	});
});
