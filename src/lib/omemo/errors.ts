export type OmemoStorageErrorCode =
	| "locked"
	| "invalid-passphrase"
	| "weak-passphrase"
	| "already-configured"
	| "not-configured"
	| "decryption-failed"
	| "unsupported-envelope"
	| "crypto-unavailable"
	| "account-mismatch";

const MESSAGES: Record<OmemoStorageErrorCode, string> = {
	locked: "The OMEMO key store is locked.",
	"invalid-passphrase": "The OMEMO passphrase is incorrect.",
	"weak-passphrase": "Use an OMEMO passphrase of at least 8 characters.",
	"already-configured": "OMEMO is already set up for this account.",
	"not-configured": "OMEMO is not set up for this account.",
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

export type OmemoMessageErrorCode =
	| "not-initialized"
	| "invalid-envelope"
	| "no-device-key"
	| "no-recipients"
	| "encrypt-failed"
	| "decrypt-failed"
	| "identity-changed";

const MESSAGE_MESSAGES: Record<OmemoMessageErrorCode, string> = {
	"not-initialized": "The OMEMO device is not initialized.",
	"invalid-envelope": "The OMEMO message envelope is invalid.",
	"no-device-key": "The OMEMO message has no key for this device.",
	"no-recipients": "The OMEMO message has no recipient devices.",
	"encrypt-failed": "The OMEMO message could not be encrypted.",
	"decrypt-failed": "The OMEMO message could not be decrypted.",
	"identity-changed": "The OMEMO device identity key has changed.",
};

/**
 * Typed failure for OMEMO message encryption and decryption.
 *
 * Messages are fixed per code and never include key material or plaintext.
 */
export class OmemoMessageError extends Error {
	readonly code: OmemoMessageErrorCode;

	constructor(code: OmemoMessageErrorCode, message = MESSAGE_MESSAGES[code]) {
		super(message);
		this.name = "OmemoMessageError";
		this.code = code;
	}
}

export type OmemoSessionErrorCode =
	| "invalid-device"
	| "bundle-missing"
	| "identity-missing"
	| "identity-changed"
	| "prekey-missing"
	| "untrusted-device"
	| "session-failed";

const SESSION_MESSAGES: Record<OmemoSessionErrorCode, string> = {
	"invalid-device": "The OMEMO device ID is invalid.",
	"bundle-missing": "The OMEMO bundle is not available.",
	"identity-missing": "The OMEMO identity key is not available.",
	"identity-changed": "The OMEMO device identity key has changed.",
	"prekey-missing": "The OMEMO pre-key is not available.",
	"untrusted-device": "The OMEMO device is not trusted.",
	"session-failed": "The OMEMO session could not be established.",
};

/**
 * Typed failure for OMEMO key lifecycle and session setup.
 *
 * Messages are fixed per code and never include key material, bundles, or
 * account credentials.
 */
export class OmemoSessionError extends Error {
	readonly code: OmemoSessionErrorCode;

	constructor(code: OmemoSessionErrorCode, message = SESSION_MESSAGES[code]) {
		super(message);
		this.name = "OmemoSessionError";
		this.code = code;
	}
}

/**
 * Returns a fixed OMEMO error message for known failures and a safe fallback
 * for anything else, so UI code never renders an arbitrary transport error.
 */
export function omemoErrorMessage(error: unknown, fallback: string): string {
	if (
		error instanceof OmemoStorageError ||
		error instanceof OmemoPepError ||
		error instanceof OmemoMessageError ||
		error instanceof OmemoSessionError
	) {
		return error.message;
	}
	return fallback;
}
