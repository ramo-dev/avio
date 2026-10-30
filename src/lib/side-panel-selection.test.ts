import { describe, expect, it } from "vitest";
import {
	encodeSidePanelParam,
	parseSidePanelParam,
	sidePanelMeta,
} from "#/lib/side-panel-selection";

describe("side panel param", () => {
	it("round-trips contact and room selections", () => {
		const contact = encodeSidePanelParam({
			kind: "contact",
			jid: "bob@example.com",
		});
		expect(contact).toBe("contact%3Abob%40example.com");
		expect(parseSidePanelParam(contact)).toEqual({
			kind: "contact",
			jid: "bob@example.com",
		});

		const room = encodeSidePanelParam({
			kind: "room",
			jid: "dev@conference.example.com",
		});
		expect(parseSidePanelParam(room)).toEqual({
			kind: "room",
			jid: "dev@conference.example.com",
		});
	});

	it("accepts raw values the router may hand back decoded", () => {
		expect(parseSidePanelParam("room:dev@conference.example.com")).toEqual({
			kind: "room",
			jid: "dev@conference.example.com",
		});
	});

	it("rejects invalid values", () => {
		expect(parseSidePanelParam(undefined)).toBeNull();
		expect(parseSidePanelParam(42)).toBeNull();
		expect(parseSidePanelParam("")).toBeNull();
		expect(parseSidePanelParam("group:bob@example.com")).toBeNull();
		expect(parseSidePanelParam("contact:")).toBeNull();
		expect(parseSidePanelParam("contact:bob@example.com/phone")).toBeNull();
		expect(parseSidePanelParam("contact:not a jid")).toBeNull();
		expect(parseSidePanelParam(`contact:${"a".repeat(3072)}`)).toBeNull();
	});
});

describe("side panel meta", () => {
	it("labels contact panels statically", () => {
		const meta = sidePanelMeta(
			{ kind: "contact", jid: "bob@example.com" },
			{ rooms: {} },
		);
		expect(meta).toEqual({
			title: "Contact info",
			description: "Direct XMPP conversation",
		});
	});

	it("labels room panels with the room name", () => {
		const meta = sidePanelMeta(
			{ kind: "room", jid: "dev@conference.example.com" },
			{ rooms: { "dev@conference.example.com": { name: "Dev" } as never } },
		);
		expect(meta.title).toBe("Dev");
		expect(meta.description).toBe("Group chat");
	});

	it("falls back to the room local part when the room is unknown", () => {
		const meta = sidePanelMeta(
			{ kind: "room", jid: "dev@conference.example.com" },
			{ rooms: {} },
		);
		expect(meta.title).toBe("dev");
	});
});
