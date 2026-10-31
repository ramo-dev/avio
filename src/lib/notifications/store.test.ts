import { beforeEach, describe, expect, it } from "vitest";
import {
	addNotification,
	clearNotifications,
	getNotifications,
	markAllNotificationsRead,
	markNotificationRead,
	removeInviteNotifications,
} from "#/lib/notifications/store";
import type { StoredNotification } from "#/types/notification";

function note(id: string, overrides: Partial<StoredNotification> = {}) {
	return {
		id,
		jid: "bob@example.com",
		kind: "direct" as const,
		name: "Bob",
		body: "Hello",
		timestamp: 1000,
		read: false,
		...overrides,
	};
}

describe("notification store", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("persists notifications and deduplicates ids", () => {
		const account = "dedupe@example.com";
		addNotification(account, note("m1"));
		addNotification(account, note("m1"));
		addNotification(account, note("m2", { body: "Again" }));

		expect(getNotifications(account)).toHaveLength(2);
		expect(getNotifications(account).map((item) => item.body)).toEqual([
			"Hello",
			"Again",
		]);
	});

	it("marks one or all notifications read", () => {
		const account = "read@example.com";
		addNotification(account, note("m1"));
		addNotification(account, note("m2"));

		markNotificationRead(account, "m1");
		expect(getNotifications(account)[0]?.read).toBe(true);
		expect(getNotifications(account)[1]?.read).toBe(false);

		markAllNotificationsRead(account);
		expect(getNotifications(account).every((item) => item.read)).toBe(true);
	});

	it("keeps a bounded history and clears it", () => {
		const account = "bounded@example.com";
		for (let index = 0; index < 55; index += 1) {
			addNotification(account, note(`m${index}`));
		}
		expect(getNotifications(account)).toHaveLength(50);

		clearNotifications(account);
		expect(getNotifications(account)).toHaveLength(0);
	});

	it("isolates notifications per account", () => {
		addNotification("one@example.com", note("m1"));
		expect(getNotifications("two@example.com")).toHaveLength(0);
	});

	it("removes stale invite notifications for a room", () => {
		const account = "invite@example.com";
		addNotification(
			account,
			note("invite:room", {
				jid: "room@conference.example.com",
				invite: true,
			}),
		);
		addNotification(account, note("message"));

		removeInviteNotifications(account, "room@conference.example.com");

		expect(getNotifications(account).map((item) => item.id)).toEqual([
			"message",
		]);
	});
});
