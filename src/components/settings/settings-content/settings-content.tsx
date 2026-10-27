import {
	setSoundVolume,
	useSoundMuted,
	useSoundVolume,
} from "#/components/common/sound/sound-store";
import { SoundToggle } from "#/components/common/sound/sound-toggle";
import { Slider } from "#/components/ui/slider";

export function SettingsContent() {
	const muted = useSoundMuted();
	const volume = useSoundVolume();
	const percent = Math.round(volume * 100);

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-1">
					<p className="text-sm font-medium">Interface sounds</p>
					<p className="text-xs text-muted-foreground">
						Subtle cues for taps, menus, and messages.
					</p>
				</div>
				<SoundToggle />
			</div>

			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<label htmlFor="sound-volume" className="text-sm font-medium">
						Volume
					</label>
					<span className="text-xs text-muted-foreground">{percent}%</span>
				</div>
				<Slider
					id="sound-volume"
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
		</div>
	);
}
