import { useSyncExternalStore } from "react";
import {
	EMPTY_NOTIFICATIONS,
	getNotifications,
	subscribeNotifications,
} from "#/lib/notifications/store";
import type { StoredNotification } from "#/types/notification";

export function useNotifications(
	accountJid: string | null,
): StoredNotification[] {
	return useSyncExternalStore(
		subscribeNotifications,
		() => getNotifications(accountJid),
		() => EMPTY_NOTIFICATIONS,
	);
}
