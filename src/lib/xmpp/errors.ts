import type { XmppError, XmppErrorCode } from "#/types/xmpp";

const FRIENDLY_MESSAGES: Record<XmppErrorCode, string> = {
	"invalid-jid": "Enter a valid JID, for example you@example.com.",
	"auth-failed": "The server rejected those credentials.",
	"connection-failed": "Could not reach the XMPP server.",
	disconnected: "The connection was lost.",
	"not-connected": "Connect to XMPP before sending a message.",
	"send-failed": "The message could not be sent.",
	unknown: "Something went wrong.",
};

export function createXmppError(
	code: XmppErrorCode,
	cause?: unknown,
	message = FRIENDLY_MESSAGES[code],
): XmppError {
	return { code, message, cause };
}

export function normalizeXmppError(
	error: unknown,
	fallback: XmppErrorCode = "unknown",
): XmppError {
	if (isXmppError(error)) return error;
	const message =
		error instanceof Error && error.message
			? error.message
			: FRIENDLY_MESSAGES[fallback];
	return { code: fallback, message, cause: error };
}

export function isXmppError(value: unknown): value is XmppError {
	return (
		typeof value === "object" &&
		value !== null &&
		"code" in value &&
		"message" in value &&
		typeof (value as XmppError).code === "string" &&
		typeof (value as XmppError).message === "string"
	);
}
