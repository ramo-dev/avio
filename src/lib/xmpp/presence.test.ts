import { describe, expect, it } from "vitest";
import { createInitialState, reduceEvent } from "#/lib/xmpp/reducers";

const available = { show: "available" as const, priority: 0 };

describe("presence aggregation", () => {
	it("stays online while any resource is available", () => {
		let state = createInitialState();
		state = reduceEvent(state, {
			type: "presence",
			jid: "bob@example.com/phone",
			presence: available,
		});
		state = reduceEvent(state, {
			type: "presence",
			jid: "bob@example.com/desktop",
			presence: available,
		});

		expect(state.contacts["bob@example.com"]?.presence.show).toBe("available");

		state = reduceEvent(state, {
			type: "presence",
			jid: "bob@example.com/phone",
			presence: { show: "offline", priority: 0, lastSeen: 1000 },
		});

		expect(state.contacts["bob@example.com"]?.presence.show).toBe("available");
	});

	it("goes offline after every resource disconnects", () => {
		let state = createInitialState();
		state = reduceEvent(state, {
			type: "presence",
			jid: "bob@example.com/phone",
			presence: available,
		});
		state = reduceEvent(state, {
			type: "presence",
			jid: "bob@example.com/phone",
			presence: { show: "offline", priority: 0, lastSeen: 2000 },
		});

		expect(state.contacts["bob@example.com"]?.presence.show).toBe("offline");
		expect(state.contacts["bob@example.com"]?.presence.lastSeen).toBe(2000);
	});
});
