import { encodeBase64 } from "#/lib/omemo/base64";
import { OmemoSessionError } from "#/lib/omemo/errors";
import type { OmemoKeyStore } from "#/lib/omemo/store";
import type { OmemoPepBundle } from "#/types/omemo";

/** Legacy XEP-0384 0.3.0 namespace used by libomemo.js sessions and bundles. */
export const OMEMO_LEGACY_VERSION = "eu.siacs.conversations.axolotl" as const;
export const TARGET_PREKEY_COUNT = 100;
export const MIN_PREKEY_COUNT = 20;

function toBase64(buffer: ArrayBuffer): string {
	return encodeBase64(new Uint8Array(buffer));
}

/** Assembles the legacy PEP bundle from persisted local key material. */
export async function createLegacyBundle(
	store: OmemoKeyStore,
): Promise<OmemoPepBundle> {
	await store.load();
	const identity = await store.getIdentityKeyPair();
	if (!identity) throw new OmemoSessionError("identity-missing");
	const deviceId = await store.getDeviceId();
	if (deviceId === undefined) throw new OmemoSessionError("invalid-device");
	const signedPreKeyId = await store.getCurrentSignedPreKeyId();
	if (signedPreKeyId === undefined) {
		throw new OmemoSessionError("prekey-missing");
	}
	const signedPreKey = await store.loadSignedPreKey(signedPreKeyId);
	const signature = await store.loadSignedPreKeySignature(signedPreKeyId);
	if (!signedPreKey || !signature) {
		throw new OmemoSessionError("prekey-missing");
	}
	const preKeys = await store.listPreKeys();
	if (preKeys.length === 0) throw new OmemoSessionError("prekey-missing");

	return {
		deviceId,
		identityKey: toBase64(identity.pubKey),
		signedPreKeyId,
		signedPreKeyPublic: toBase64(signedPreKey.keyPair.pubKey),
		signedPreKeySignature: toBase64(signature),
		preKeys: preKeys.slice(0, TARGET_PREKEY_COUNT).map((preKey) => ({
			id: preKey.id,
			publicKey: toBase64(preKey.keyPair.pubKey),
		})),
	};
}
