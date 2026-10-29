import type { StoredNotification } from "#/types/notification";

const STORAGE_PREFIX = "avio.notifications.v1";
const MAX_NOTIFICATIONS = 50;

const EMPTY: StoredNotification[] = [];
const listeners = new Set<() => void>();
let accountKey: string | null = null;
let items: StoredNotification[] = EMPTY;

function storageKey(accountJid: string | null): string {
	return `${STORAGE_PREFIX}:${accountJid ?? "guest"}`;
}

function read(accountJid: string | null): StoredNotification[] {
	if (typeof window === "undefined") return EMPTY;
	try {
		const raw = window.localStorage.getItem(storageKey(accountJid));
		if (!raw) return EMPTY;
		const parsed: unknown = JSON.parse(raw);
		return isNotificationList(parsed) ? parsed : EMPTY;
	} catch {
		return EMPTY;
	}
}

function write(accountJid: string | null, next: StoredNotification[]) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(storageKey(accountJid), JSON.stringify(next));
	} catch {
		// Quota/private-browsing failures keep the in-memory copy.
	}
}

function ensure(accountJid: string | null): StoredNotification[] {
	if (accountKey === accountJid) return items;
	accountKey = accountJid;
	items = read(accountJid);
	return items;
}

function notify() {
	for (const listener of listeners) listener();
}

export function getNotifications(
	accountJid: string | null,
): StoredNotification[] {
	return ensure(accountJid);
}

export function subscribeNotifications(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function addNotification(
	accountJid: string | null,
	notification: StoredNotification,
) {
	const current = ensure(accountJid);
	if (current.some((item) => item.id === notification.id)) return;

	items = [...current, notification].slice(-MAX_NOTIFICATIONS);
	write(accountJid, items);
	notify();
}

export function markNotificationRead(
	accountJid: string | null,
	notificationId: string,
) {
	const current = ensure(accountJid);
	let changed = false;
	const next = current.map((item) => {
		if (item.id !== notificationId || item.read) return item;
		changed = true;
		return { ...item, read: true };
	});
	if (!changed) return;
	items = next;
	write(accountJid, items);
	notify();
}

export function markAllNotificationsRead(accountJid: string | null) {
	const current = ensure(accountJid);
	if (current.every((item) => item.read)) return;
	items = current.map((item) => ({ ...item, read: true }));
	write(accountJid, items);
	notify();
}

export function clearNotifications(accountJid: string | null) {
	ensure(accountJid);
	items = EMPTY;
	write(accountJid, items);
	notify();
}

export const EMPTY_NOTIFICATIONS = EMPTY;

function isNotificationList(value: unknown): value is StoredNotification[] {
	return (
		Array.isArray(value) &&
		value.every(
			(item) =>
				typeof item === "object" &&
				item !== null &&
				typeof (item as StoredNotification).id === "string" &&
				typeof (item as StoredNotification).jid === "string" &&
				typeof (item as StoredNotification).name === "string" &&
				typeof (item as StoredNotification).body === "string" &&
				typeof (item as StoredNotification).timestamp === "number" &&
				typeof (item as StoredNotification).read === "boolean",
		)
	);
}
