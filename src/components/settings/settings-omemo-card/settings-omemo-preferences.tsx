import { SettingRow } from "#/components/settings/setting-row/setting-row";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import { Switch } from "#/components/ui/switch";
import { useSettings } from "#/hooks/use-settings";
import {
	setDefaultEncryption,
	setRememberOmemoUnlock,
} from "#/lib/settings/preferences";

/** Default encryption behavior and tab-scoped unlock preference. */
export function SettingsOmemoPreferences() {
	const { security } = useSettings();

	return (
		<div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
			<SettingRow
				title="Default for new direct chats"
				description="Choose whether new one-to-one chats start unencrypted or try OMEMO first. You can still change it per conversation in the composer."
				control={
					<NativeSelect
						aria-label="Default end-to-end encryption"
						value={security.defaultEncryption}
						onChange={(event) => {
							setDefaultEncryption(
								event.target.value === "omemo" ? "omemo" : "none",
							);
						}}
					>
						<NativeSelectOption value="none">None</NativeSelectOption>
						<NativeSelectOption value="omemo">OMEMO</NativeSelectOption>
					</NativeSelect>
				}
			/>
			<SettingRow
				title="Remember unlock on this device"
				description="Keeps a non-exportable key in this browser so a refresh can unlock OMEMO without your passphrase. The passphrase is never stored. The key is cleared by Lock, logout, or 10 minutes of inactivity. It takes effect after the next unlock and does not protect against malicious scripts in this app."
				control={
					<Switch
						aria-label="Remember OMEMO unlock on this device"
						checked={security.rememberOmemoUnlock}
						onCheckedChange={setRememberOmemoUnlock}
					/>
				}
			/>
		</div>
	);
}
