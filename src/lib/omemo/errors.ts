export type OmemoStorageErrorCode =
	| "locked"
	| "invalid-passphrase"
	| "decryption-failed"
	| "unsupported-envelope"
	| "crypto-unavailable"
	| "account-mismatch";

const MESSAGES: Record<OmemoStorageErrorCode, string> = {
	locked: "The OMEMO key store is locked.",
	"invalid-passphrase": "The OMEMO passphrase is incorrect.",
	"decryption-failed": "The OMEMO key data could not be decrypted.",
	"unsupported-envelope": "The OMEMO key envelope format is not supported.",
	"crypto-unavailable": "Web Crypto is unavailable in this environment.",
	"account-mismatch": "The OMEMO key data belongs to a different account.",
};

/**
 * Typed failure for encrypted OMEMO storage.
 *
 * Messages are fixed per code and never include the passphrase, key material,
 * or decrypted state.
 */
export class OmemoStorageError extends Error {
	readonly code: OmemoStorageErrorCode;

	constructor(code: OmemoStorageErrorCode, message = MESSAGES[code]) {
		super(message);
		this.name = "OmemoStorageError";
		this.code = code;
	}
}
