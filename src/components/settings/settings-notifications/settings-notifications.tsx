import { useState } from "react";
import { toast } from "react-hot-toast";
import { SettingRow } from "#/components/settings/setting-row/setting-row";
import { SettingsSection } from "#/components/settings/settings-section/settings-section";
import { Switch } from "#/components/ui/switch";
import { useSettings } from "#/hooks/use-settings";
import {
	setNotificationPreviews,
	setNotificationsEnabled,
} from "#/lib/settings/preferences";

type PermissionState = NotificationPermission | "unsupported";

export function SettingsNotifications() {
	const { notifications } = useSettings();
	const [permission, setPermission] = useState<PermissionState>(() =>
		typeof Notification === "undefined"
			? "unsupported"
			: Notification.permission,
	);

	async function toggleEnabled(enabled: boolean) {
		if (!enabled) {
			setNotificationsEnabled(false);
			return;
		}
		if (typeof Notification === "undefined") {
			toast.error("This browser does not support notifications.");
			return;
		}
		if (Notification.permission === "denied") {
			toast.error("Notifications are blocked in your browser settings.");
			return;
		}

		const next =
			Notification.permission === "granted"
				? "granted"
				: await Notification.requestPermission();
		setPermission(next);
		if (next !== "granted") {
			toast.error("Notification permission was not granted.");
			return;
		}
		setNotificationsEnabled(true);
	}

	return (
		<SettingsSection
			title="Notifications"
			description="Show a system notification when a message arrives while Avio is in the background."
		>
			<SettingRow
				title="Desktop notifications"
				description={permissionText(permission)}
				control={
					<Switch
						aria-label="Desktop notifications"
						checked={notifications.enabled}
						onCheckedChange={(checked) => void toggleEnabled(checked)}
					/>
				}
			/>
			<SettingRow
				title="Message preview"
				description="Include the sender and message text in the notification."
				control={
					<Switch
						aria-label="Message preview"
						checked={notifications.previews}
						disabled={!notifications.enabled}
						onCheckedChange={setNotificationPreviews}
					/>
				}
			/>
		</SettingsSection>
	);
}

function permissionText(permission: PermissionState): string {
	if (permission === "granted") {
		return "Notifications are allowed. Muted chats stay quiet.";
	}
	if (permission === "denied") {
		return "Blocked in browser settings. Allow notifications for this site to enable them.";
	}
	if (permission === "unsupported") {
		return "This browser does not expose the Notification API.";
	}
	return "You will be asked for permission when you enable this.";
}
