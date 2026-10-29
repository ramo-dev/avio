// @vitest-environment node

import {
	InMemoryStore,
	KeyHelper,
	OMEMOAddress,
	SessionBuilder,
	SessionCipher,
} from "libomemo.js";
import { describe, expect, it } from "vitest";

const VERSION = "eu.siacs.conversations.axolotl" as const;

async function createStore() {
	const store = new InMemoryStore();
	const identityKey = await KeyHelper.generateIdentityKeyPair();
	const registrationId = KeyHelper.generateRegistrationId();
	const signedPreKey = await KeyHelper.generateSignedPreKey(
		identityKey,
		1,
		VERSION,
	);
	const preKey = await KeyHelper.generatePreKey(1);

	store.put("identityKey", identityKey);
	store.put("registrationId", registrationId);
	store.storeSignedPreKey(1, signedPreKey.keyPair);
	store.storePreKey(1, preKey.keyPair);

	return { store, identityKey, registrationId, signedPreKey, preKey };
}

describe("libomemo.js spike", () => {
	it("establishes a 1:1 session and decrypts both directions", async () => {
		const alice = await createStore();
		const bob = await createStore();
		const aliceAddress = new OMEMOAddress("alice@example.com", 1001);
		const bobAddress = new OMEMOAddress("bob@example.com", 2002);

		await new SessionBuilder(bob.store, aliceAddress, VERSION).processPreKey({
			identityKey: alice.identityKey.pubKey,
			registrationId: alice.registrationId,
			signedPreKey: {
				keyId: 1,
				publicKey: alice.signedPreKey.keyPair.pubKey,
				signature: alice.signedPreKey.signature,
			},
			preKey: {
				keyId: 1,
				publicKey: alice.preKey.keyPair.pubKey,
			},
		});

		const encrypted = await new SessionCipher(
			bob.store,
			aliceAddress,
			VERSION,
		).encrypt("hello alice");

		const aliceCipher = new SessionCipher(alice.store, bobAddress, VERSION);
		const decrypted =
			encrypted.type === 3
				? await aliceCipher.decryptPreKeyWhisperMessage(
						encrypted.body,
						"binary",
					)
				: await aliceCipher.decryptWhisperMessage(encrypted.body, "binary");

		expect(new TextDecoder().decode(decrypted.plaintext)).toBe("hello alice");

		const reply = await aliceCipher.encrypt("hello bob");
		const replyPlain = await new SessionCipher(
			bob.store,
			aliceAddress,
			VERSION,
		).decryptWhisperMessage(reply.body, "binary");

		expect(new TextDecoder().decode(replyPlain.plaintext)).toBe("hello bob");
	});
});
