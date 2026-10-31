import { describe, expect, it } from "vitest";
import { MIN_PASSPHRASE_LENGTH, passphraseIssue } from "#/lib/omemo/passphrase";

describe("passphraseIssue", () => {
	it("requires the minimum length", () => {
		expect(MIN_PASSPHRASE_LENGTH).toBe(12);
		expect("eleven-char".length).toBe(11);
		expect("twelve-chars".length).toBe(12);
		expect(passphraseIssue("eleven-char")).toBe("too-short");
		expect(passphraseIssue("twelve-chars")).toBeNull();
	});

	it("accepts a long, varied passphrase", () => {
		expect(passphraseIssue("correct horse battery staple")).toBeNull();
	});

	it("rejects common passphrases regardless of case or surrounding space", () => {
		expect(passphraseIssue("123456789012")).toBe("too-common");
		expect(passphraseIssue("  QwertyUiop  ")).toBe("too-common");
	});

	it("rejects passphrases with too few distinct characters", () => {
		expect(passphraseIssue("aaaaaaaaaaaaaaaa")).toBe("too-repetitive");
		expect(passphraseIssue("abababababababab")).toBe("too-repetitive");
	});
});
