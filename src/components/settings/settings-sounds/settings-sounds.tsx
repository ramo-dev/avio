import {
	setSoundVolume,
	useSoundMuted,
	useSoundVolume,
} from "#/components/common/sound/sound-store";
import { SoundToggle } from "#/components/common/sound/sound-toggle";
import { SettingRow } from "#/components/settings/setting-row/setting-row";
import { SettingsSection } from "#/components/settings/settings-section/settings-section";
import { Slider } from "#/components/ui/slider";

export function SettingsSounds() {
	const muted = useSoundMuted();
	const volume = useSoundVolume();
	const percent = Math.round(volume * 100);

	return (
		<SettingsSection
			title="Sounds"
			description="Subtle cues for taps, menus, and messages."
		>
			<SettingRow
				title="Interface sounds"
				description="Play a short cue when you interact with Avio."
				control={<SoundToggle aria-label="Toggle interface sounds" />}
			/>

			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<label
						htmlFor="settings-sound-volume"
						className="text-sm font-medium"
					>
						Volume
					</label>
					<span className="text-xs text-muted-foreground">{percent}%</span>
				</div>
				<Slider
					id="settings-sound-volume"
					aria-label="Sound volume"
					value={[percent]}
					min={0}
					max={100}
					step={1}
					onValueChange={(value) => {
						const next = Array.isArray(value) ? value[0] : value;
						if (typeof next === "number") setSoundVolume(next / 100);
					}}
				/>
				{muted && (
					<p className="text-xs text-muted-foreground">
						Sounds are muted. Turn them back on to hear volume changes.
					</p>
				)}
			</div>
		</SettingsSection>
	);
}
