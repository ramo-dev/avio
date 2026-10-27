import { describe, expect, it } from "vitest";
import {
	bareJid,
	displayJidName,
	isValidAccountJid,
	isValidJid,
	jidLocalPart,
	parseJid,
	toAccount,
} from "#/lib/xmpp/jid";

describe("jid helpers", () => {
	it("parses full and bare JIDs", () => {
		expect(parseJid("alice@example.com/phone")).toEqual({
			localPart: "alice",
			domain: "example.com",
			resource: "phone",
			bareJid: "alice@example.com",
			fullJid: "alice@example.com/phone",
		});
		expect(bareJid("alice@example.com/phone")).toBe("alice@example.com");
	});

	it("accepts domain-only JIDs but not account JIDs", () => {
		expect(isValidJid("example.com")).toBe(true);
		expect(isValidAccountJid("example.com")).toBe(false);
		expect(isValidAccountJid("alice@example.com")).toBe(true);
	});

	it("rejects malformed values", () => {
		expect(isValidJid("alice@")).toBe(false);
		expect(isValidJid("alice example.com")).toBe(false);
		expect(parseJid("")).toBeNull();
	});

	it("builds accounts and display names", () => {
		expect(toAccount("alice@example.com/web")?.bareJid).toBe(
			"alice@example.com",
		);
		expect(toAccount("example.com")).toBeNull();
		expect(jidLocalPart("alice@example.com")).toBe("alice");
		expect(displayJidName("alice@example.com", "Alice")).toBe("Alice");
		expect(displayJidName("alice@example.com")).toBe("alice");
	});
});
