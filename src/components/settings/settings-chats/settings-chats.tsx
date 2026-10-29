import { SettingRow } from "#/components/settings/setting-row/setting-row";
import { SettingsSection } from "#/components/settings/settings-section/settings-section";
import { Switch } from "#/components/ui/switch";
import { useSettings } from "#/hooks/use-settings";
import {
	setEnterToSend,
	setTypingIndicators,
} from "#/lib/settings/preferences";

export function SettingsChats() {
	const { chats } = useSettings();

	return (
		<SettingsSection
			title="Chats"
			description="Control how composing and typing behave."
		>
			<SettingRow
				title="Enter to send"
				description="Press Enter to send. Shift+Enter starts a new line."
				control={
					<Switch
						aria-label="Enter to send"
						checked={chats.enterToSend}
						onCheckedChange={setEnterToSend}
					/>
				}
			/>
			<SettingRow
				title="Typing indicators"
				description="Let contacts see when you are typing."
				control={
					<Switch
						aria-label="Typing indicators"
						checked={chats.typingIndicators}
						onCheckedChange={setTypingIndicators}
					/>
				}
			/>
		</SettingsSection>
	);
}
