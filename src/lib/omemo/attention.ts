import type { OmemoAccountStatus } from "#/types/omemo";

/**
 * Composer-side OMEMO state that blocks encrypted sending.
 *
 * The user may intend encryption (default preference or per-chat choice) while
 * OMEMO is not usable yet. The UI then shows an attention state that leads to
 * Security settings instead of a bare "unlock OMEMO" toast.
 */
export type EncryptionAttention = Exclude<
	OmemoAccountStatus,
	"ready" | "unlocking"
>;

/** Messages that explain what the composer lock button leads to. */
const ATTENTION_COPY: Record<EncryptionAttention, string> = {
	disabled: "Connect to XMPP to use OMEMO encryption.",
	setup: "Set up OMEMO in Security settings to send encrypted messages.",
	locked: "Unlock OMEMO in Security settings to send encrypted messages.",
	error: "OMEMO is unavailable. Open Security settings to check its status.",
};

export function encryptionAttentionCopy(
	attention: EncryptionAttention,
): string {
	return ATTENTION_COPY[attention];
}

/**
 * Returns the attention state for a conversation, or null when encryption can
 * behave normally. `intended` is the persistent choice (default preference or
 * per-chat override); `status` is the account's OMEMO state.
 */
export function resolveEncryptionAttention(
	isDirect: boolean,
	intended: boolean,
	status: OmemoAccountStatus,
): EncryptionAttention | null {
	if (!isDirect || !intended) return null;
	if (status === "ready" || status === "unlocking") return null;
	return status;
}
