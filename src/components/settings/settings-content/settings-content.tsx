import { useEffect, useState } from "react";
import { SettingsAppearance } from "#/components/settings/settings-appearance/settings-appearance";
import { SettingsChats } from "#/components/settings/settings-chats/settings-chats";
import {
	SettingsNav,
	type SettingsSectionId,
} from "#/components/settings/settings-nav/settings-nav";
import { SettingsNotifications } from "#/components/settings/settings-notifications/settings-notifications";
import { SettingsSecurity } from "#/components/settings/settings-security/settings-security";
import { SettingsServer } from "#/components/settings/settings-server/settings-server";
import { SettingsSounds } from "#/components/settings/settings-sounds/settings-sounds";
import { ScrollArea } from "#/components/ui/scroll-area";
import { useSettings } from "#/providers/settings-provider";

export function SettingsContent() {
	const { target } = useSettings();
	const [section, setSection] = useState<SettingsSectionId>(
		target?.section ?? "appearance",
	);

	useEffect(() => {
		if (target) setSection(target.section);
	}, [target]);

	return (
		<div className="flex min-h-0 w-full flex-col gap-4 md:h-full md:flex-row md:gap-6">
			<SettingsNav value={section} onChange={setSection} />
			<ScrollArea className="min-h-0 flex-1 rounded-xl border border-input">
				<div className="p-3 md:p-6">
					{section === "appearance" && <SettingsAppearance />}
					{section === "sounds" && <SettingsSounds />}
					{section === "chats" && <SettingsChats />}
					{section === "notifications" && <SettingsNotifications />}
					{section === "security" && (
						<SettingsSecurity
							anchor={
								target?.section === "security" ? target.anchor : undefined
							}
						/>
					)}
					{section === "server" && <SettingsServer />}
				</div>
			</ScrollArea>
		</div>
	);
}
