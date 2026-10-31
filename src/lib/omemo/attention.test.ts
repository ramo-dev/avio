import { describe, expect, it } from "vitest";
import {
	encryptionAttentionCopy,
	resolveEncryptionAttention,
} from "#/lib/omemo/attention";

describe("resolveEncryptionAttention", () => {
	it("is null when encryption is not intended", () => {
		expect(resolveEncryptionAttention(true, false, "locked")).toBeNull();
		expect(resolveEncryptionAttention(false, true, "locked")).toBeNull();
	});

	it("is null when OMEMO is ready or unlocking", () => {
		expect(resolveEncryptionAttention(true, true, "ready")).toBeNull();
		expect(resolveEncryptionAttention(true, true, "unlocking")).toBeNull();
	});

	it("reports the blocking status otherwise", () => {
		expect(resolveEncryptionAttention(true, true, "locked")).toBe("locked");
		expect(resolveEncryptionAttention(true, true, "setup")).toBe("setup");
		expect(resolveEncryptionAttention(true, true, "error")).toBe("error");
		expect(resolveEncryptionAttention(true, true, "disabled")).toBe("disabled");
	});
});

describe("encryptionAttentionCopy", () => {
	it("explains each blocking status", () => {
		expect(encryptionAttentionCopy("locked")).toContain("Unlock OMEMO");
		expect(encryptionAttentionCopy("setup")).toContain("Set up OMEMO");
		expect(encryptionAttentionCopy("error")).toContain("unavailable");
	});
});
