import { useState } from "react";
import { SettingsAppearance } from "#/components/settings/settings-appearance/settings-appearance";
import { SettingsChats } from "#/components/settings/settings-chats/settings-chats";
import {
	SettingsNav,
	type SettingsSectionId,
} from "#/components/settings/settings-nav/settings-nav";
import { SettingsNotifications } from "#/components/settings/settings-notifications/settings-notifications";
import { SettingsSecurity } from "#/components/settings/settings-security/settings-security";
import { SettingsSounds } from "#/components/settings/settings-sounds/settings-sounds";

export function SettingsContent() {
	const [section, setSection] = useState<SettingsSectionId>("appearance");

	return (
		<div className="flex min-h-0 w-full flex-col gap-4 md:h-full md:flex-row md:gap-6">
			<SettingsNav value={section} onChange={setSection} />
			<div className="min-h-0 flex-1 md:overflow-y-auto border border-input p-3 md:p-6 rounded-xl">
				{section === "appearance" && <SettingsAppearance />}
				{section === "sounds" && <SettingsSounds />}
				{section === "chats" && <SettingsChats />}
				{section === "notifications" && <SettingsNotifications />}
				{section === "security" && <SettingsSecurity />}
			</div>
		</div>
	);
}
