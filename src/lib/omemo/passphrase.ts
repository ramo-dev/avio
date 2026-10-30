/**
 * Minimum length for new OMEMO passphrases. The key store is protected by an
 * offline-attackable envelope, so setup requires more than a short password.
 * Existing passphrases still unlock; only setup is checked.
 */
export const MIN_PASSPHRASE_LENGTH = 12;

const MIN_DISTINCT_CHARACTERS = 4;

/** Lowercased passphrases that attackers try first. Matched after trimming. */
const COMMON_PASSPHRASES = new Set([
	"password",
	"password1",
	"password123",
	"passphrase",
	"letmein",
	"iloveyou",
	"welcome123",
	"changeme123",
	"qwertyuiop",
	"123456789012",
	"111111111111",
	"abcdefghijkl",
	"trustno1234",
	"admin1234567",
]);

export type PassphraseIssue = "too-short" | "too-common" | "too-repetitive";

/** Returns the first reason a new passphrase is rejected, or null when it is acceptable. */
export function passphraseIssue(passphrase: string): PassphraseIssue | null {
	if (passphrase.length < MIN_PASSPHRASE_LENGTH) return "too-short";
	if (COMMON_PASSPHRASES.has(passphrase.trim().toLowerCase())) {
		return "too-common";
	}
	if (new Set(passphrase).size < MIN_DISTINCT_CHARACTERS) {
		return "too-repetitive";
	}
	return null;
}

const ISSUE_MESSAGES: Record<PassphraseIssue, string> = {
	"too-short": `Use at least ${MIN_PASSPHRASE_LENGTH} characters.`,
	"too-common":
		"That passphrase is too common. Choose a longer, unique phrase.",
	"too-repetitive": "Use more varied characters or words.",
};

export function passphraseIssueMessage(issue: PassphraseIssue): string {
	return ISSUE_MESSAGES[issue];
}
