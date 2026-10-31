import { describe, expect, it } from "vitest";
import {
	reactionSenderName,
	reactionSenderSummary,
	selectUserReactions,
} from "#/lib/xmpp/reactions";

describe("reaction helpers", () => {
	it("names the current user as You", () => {
		expect(
			reactionSenderSummary(["alice@example.com"], "alice@example.com"),
		).toBe("You");
	});

	it("uses the occupant nick when only a room JID is known", () => {
		expect(reactionSenderName("dev@conference.example.com/mary")).toBe("mary");
	});

	it("shows the full JID local part for bare senders", () => {
		expect(reactionSenderName("mary@example.com")).toBe("mary");
	});

	it("joins multiple senders in order", () => {
		expect(
			reactionSenderSummary(
				["mary@example.com", "alice@example.com"],
				"alice@example.com",
			),
		).toBe("mary, You");
	});

	it("selects the current user's reactions by bare JID", () => {
		expect(
			selectUserReactions(
				{ "alice@example.com/web": ["👍"] },
				"alice@example.com",
			),
		).toEqual(["👍"]);
	});
});
