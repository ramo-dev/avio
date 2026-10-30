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

export type OmemoPepErrorCode =
	| "invalid-device-list"
	| "invalid-bundle"
	| "publish-failed"
	| "fetch-failed"
	| "configure-failed"
	| "subscribe-failed"
	| "invalid-account";

const PEP_MESSAGES: Record<OmemoPepErrorCode, string> = {
	"invalid-device-list": "The OMEMO device list is invalid.",
	"invalid-bundle": "The OMEMO bundle is invalid.",
	"publish-failed": "The OMEMO data could not be published.",
	"fetch-failed": "The OMEMO data could not be fetched.",
	"configure-failed": "The OMEMO node could not be configured.",
	"subscribe-failed": "Could not subscribe to the OMEMO device list.",
	"invalid-account": "A valid account JID is required.",
};

/**
 * Typed failure for OMEMO PEP operations.
 *
 * Messages are fixed per code and never include stanza payloads, keys, or
 * account credentials.
 */
export class OmemoPepError extends Error {
	readonly code: OmemoPepErrorCode;

	constructor(code: OmemoPepErrorCode, message = PEP_MESSAGES[code]) {
		super(message);
		this.name = "OmemoPepError";
		this.code = code;
	}
}

/** Wraps unknown transport failures without leaking their payloads. */
export function wrapOmemoPepError(
	code: OmemoPepErrorCode,
	cause: unknown,
): OmemoPepError {
	return cause instanceof OmemoPepError ? cause : new OmemoPepError(code);
}
