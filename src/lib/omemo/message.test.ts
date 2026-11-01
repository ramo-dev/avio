// @vitest-environment node

import { describe, expect, it } from "vitest";
import { encodeBase64 } from "#/lib/omemo/base64";
import {
	ALICE,
	ALICE_DEVICE,
	BOB,
	BOB_DEVICE,
	bytes,
	createPair,
	requireKey,
} from "#/lib/omemo/message.fixtures";
import type { OmemoPepBundle } from "#/types/omemo";

describe("OmemoMessageCipher", () => {
	it("encrypts a prekey message and Bob decrypts it", async () => {
		const { server, alice, bob } = await createPair();
		const before: OmemoPepBundle | null = server.getBundle(BOB, BOB_DEVICE);
		if (!before) throw new Error("Expected Bob's bundle");
		await alice.engine.trustDevice(BOB, BOB_DEVICE);

		const envelope = await alice.cipher.encryptMessage(BOB, "hello", [
			BOB_DEVICE,
			BOB_DEVICE,
		]);
		const key = requireKey(envelope, BOB_DEVICE);

		expect(envelope.keys).toHaveLength(1);
		expect(key.preKey).toBe(true);
		expect(envelope.sid).toBe(ALICE_DEVICE);
		expect(bytes(envelope.iv)).toHaveLength(12);
		expect(bytes(envelope.payload).length).toBeGreaterThan(0);
		expect(bytes(key.value).length).toBeGreaterThan(0);

		const decrypted = await bob.cipher.decryptMessage(ALICE, envelope);

		expect(decrypted.plaintext).toBe("hello");
		expect(decrypted.senderJid).toBe(ALICE);
		expect(decrypted.senderDeviceId).toBe(ALICE_DEVICE);
		expect(decrypted.trusted).toBe(false);
		expect(decrypted.bundleRefreshed).toBe(true);

		const after: OmemoPepBundle | null = server.getBundle(BOB, BOB_DEVICE);
		if (!after) throw new Error("Expected a republished bundle");
		expect(after.preKeys).toHaveLength(before.preKeys.length - 1);
		const afterIds = new Set(after.preKeys.map((preKey) => preKey.id));
		const consumed = before.preKeys
			.map((preKey) => preKey.id)
			.filter((id) => !afterIds.has(id));
		expect(consumed).toHaveLength(1);
		expect(await bob.store.loadPreKey(consumed[0] ?? 0)).toBeUndefined();
	});

	it("carries reply and edit metadata inside the encrypted payload", async () => {
		const { alice, bob } = await createPair();
		await alice.engine.trustDevice(BOB, BOB_DEVICE);

		const envelope = await alice.cipher.encryptMessage(
			BOB,
			"edited body",
			[BOB_DEVICE],
			{ replyTo: { id: "original-1", to: ALICE }, editId: "original-1" },
		);
		const decrypted = await bob.cipher.decryptMessage(ALICE, envelope);

		expect(decrypted.plaintext).toBe("edited body");
		expect(decrypted.replyTo).toEqual({ id: "original-1", to: ALICE });
		expect(decrypted.editId).toBe("original-1");
	});

	it("treats unmarked JSON-looking bodies as plain text", async () => {
		const { alice, bob } = await createPair();
		await alice.engine.trustDevice(BOB, BOB_DEVICE);
		const body = '{"hello": "world"}';

		const envelope = await alice.cipher.encryptMessage(BOB, body, [BOB_DEVICE]);
		const decrypted = await bob.cipher.decryptMessage(ALICE, envelope);

		expect(decrypted.plaintext).toBe(body);
		expect(decrypted.replyTo).toBeUndefined();
		expect(decrypted.editId).toBeUndefined();
	});

	it("sends a non-prekey reply and decrypts it with trust", async () => {
		const { alice, bob } = await createPair();
		await alice.engine.trustDevice(BOB, BOB_DEVICE);
		await bob.engine.trustDevice(ALICE, ALICE_DEVICE);

		const first = await alice.cipher.encryptMessage(BOB, "hello", [BOB_DEVICE]);
		await bob.cipher.decryptMessage(ALICE, first);

		const reply = await bob.cipher.encryptMessage(ALICE, "hi alice", [
			ALICE_DEVICE,
		]);
		expect(requireKey(reply, ALICE_DEVICE).preKey).toBe(false);

		const decrypted = await alice.cipher.decryptMessage(BOB, reply);

		expect(decrypted.plaintext).toBe("hi alice");
		expect(decrypted.trusted).toBe(true);
		expect(decrypted.bundleRefreshed).toBe(false);
	});

	it("rejects an untrusted recipient before building a session", async () => {
		const { alice } = await createPair();

		await expect(
			alice.cipher.encryptMessage(BOB, "hello", [BOB_DEVICE]),
		).rejects.toMatchObject({ code: "untrusted-device" });
		expect(
			await alice.store.loadSession(`${BOB}.${BOB_DEVICE}`),
		).toBeUndefined();
	});

	it("rejects an empty recipient list", async () => {
		const { alice } = await createPair();

		await expect(
			alice.cipher.encryptMessage(BOB, "hello", []),
		).rejects.toMatchObject({ code: "no-recipients" });
	});

	it("rejects an envelope without a key for the local device", async () => {
		const { alice, bob } = await createPair();
		await alice.engine.trustDevice(BOB, BOB_DEVICE);
		const envelope = await alice.cipher.encryptMessage(BOB, "hello", [
			BOB_DEVICE,
		]);
		const key = requireKey(envelope, BOB_DEVICE);

		await expect(
			bob.cipher.decryptMessage(ALICE, {
				...envelope,
				keys: [{ ...key, rid: 999_999 }],
			}),
		).rejects.toMatchObject({ code: "no-device-key" });
	});

	it("rejects a tampered payload", async () => {
		const { alice, bob } = await createPair();
		await alice.engine.trustDevice(BOB, BOB_DEVICE);
		const envelope = await alice.cipher.encryptMessage(BOB, "hello", [
			BOB_DEVICE,
		]);
		const payload = bytes(envelope.payload).slice();
		payload[0] = (payload[0] ?? 0) ^ 0xff;

		await expect(
			bob.cipher.decryptMessage(ALICE, {
				...envelope,
				payload: encodeBase64(payload),
			}),
		).rejects.toMatchObject({ code: "decrypt-failed" });
	});

	it("rejects malformed base64 and IVs", async () => {
		const { alice, bob } = await createPair();
		await alice.engine.trustDevice(BOB, BOB_DEVICE);
		const envelope = await alice.cipher.encryptMessage(BOB, "hello", [
			BOB_DEVICE,
		]);
		const key = requireKey(envelope, BOB_DEVICE);

		for (const malformed of [
			{ ...envelope, iv: "%%%not-base64%%%" },
			{ ...envelope, iv: encodeBase64(new Uint8Array(8)) },
			{ ...envelope, payload: "%%%not-base64%%%" },
			{ ...envelope, keys: [{ ...key, value: "" }] },
			{ ...envelope, sid: 0 },
		]) {
			await expect(
				bob.cipher.decryptMessage(ALICE, malformed),
			).rejects.toMatchObject({ code: "invalid-envelope" });
		}
	});

	it("rejects a changed sender identity and clears app trust", async () => {
		const { alice, bob } = await createPair();
		await alice.engine.trustDevice(BOB, BOB_DEVICE);
		await bob.engine.trustDevice(ALICE, ALICE_DEVICE);

		const first = await alice.cipher.encryptMessage(BOB, "hello", [BOB_DEVICE]);
		await bob.cipher.decryptMessage(ALICE, first);
		const reply = await bob.cipher.encryptMessage(ALICE, "reply", [
			ALICE_DEVICE,
		]);
		await alice.cipher.decryptMessage(BOB, reply);

		const address = `${ALICE}.${ALICE_DEVICE}`;
		await bob.store.saveIdentity(address, new Uint8Array(33).fill(7).buffer);

		const second = await alice.cipher.encryptMessage(BOB, "again", [
			BOB_DEVICE,
		]);
		expect(requireKey(second, BOB_DEVICE).preKey).toBe(false);

		await expect(
			bob.cipher.decryptMessage(ALICE, second),
		).rejects.toMatchObject({ code: "identity-changed" });
		expect(await bob.store.loadTrustedIdentity(address)).toBeUndefined();
		expect(await bob.engine.isTrustedDevice(ALICE, ALICE_DEVICE)).toBe(false);
	});
});
