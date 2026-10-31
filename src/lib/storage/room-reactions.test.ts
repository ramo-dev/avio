// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
	createMemoryRoomReactionStore,
	createRoomReactionStore,
} from "#/lib/storage/room-reactions";

const ROOM = "dev@conference.example.com";
const STORAGE_KEY = "avio.room.reactions.v1";

const snapshot = {
	[ROOM]: { "msg-1": { "mary@example.com": ["👍"] } },
};

describe("room reaction snapshot storage", () => {
	beforeEach(() => {
		window.sessionStorage.clear();
	});

	it("round-trips and clears the tab-scoped snapshot", () => {
		const store = createRoomReactionStore();
		store.save(snapshot);

		expect(createRoomReactionStore().load()).toEqual(snapshot);
		expect(window.sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();

		store.clear();
		expect(store.load()).toEqual({});
		expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
	});

	it("ignores malformed entries", () => {
		window.sessionStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				[ROOM]: {
					"msg-1": { "mary@example.com": ["👍"], broken: 42 },
					"msg-2": "nope",
				},
				bad: [],
			}),
		);
		expect(createRoomReactionStore().load()).toEqual({
			[ROOM]: { "msg-1": { "mary@example.com": ["👍"] } },
		});
	});

	it("clears the in-memory variant", () => {
		const store = createMemoryRoomReactionStore();
		store.save(snapshot);
		expect(store.load()).toEqual(snapshot);
		store.clear();
		expect(store.load()).toEqual({});
	});
});
