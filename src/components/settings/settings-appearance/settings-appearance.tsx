import { RiComputerLine, RiMoonLine, RiSunLine } from "@remixicon/react";
import { SettingsSection } from "#/components/settings/settings-section/settings-section";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { useSettings } from "#/hooks/use-settings";
import { setTheme } from "#/lib/settings/preferences";
import type { ThemePreference } from "#/types/settings";

const THEMES: Array<{
	value: ThemePreference;
	label: string;
	icon: typeof RiSunLine;
}> = [
	{ value: "system", label: "System", icon: RiComputerLine },
	{ value: "light", label: "Light", icon: RiSunLine },
	{ value: "dark", label: "Dark", icon: RiMoonLine },
];

export function SettingsAppearance() {
	const { appearance } = useSettings();

	return (
		<SettingsSection
			title="Appearance"
			description="Choose how Avio looks on this device."
		>
			<div className="space-y-3">
				<p className="text-sm font-medium">Theme</p>
				<ToggleGroup
					variant="outline"
					spacing={0}
					aria-label="Theme"
					className="w-full"
					value={[appearance.theme]}
					onValueChange={(value) => {
						const next = value.at(-1) as ThemePreference | undefined;
						if (next) setTheme(next);
					}}
				>
					{THEMES.map(({ value, label, icon: Icon }) => (
						<ToggleGroupItem
							key={value}
							value={value}
							className="flex-1 gap-1.5 px-2 text-xs sm:text-sm"
						>
							<Icon className="size-4" />
							{label}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				<p className="text-xs text-muted-foreground">
					System follows your device appearance.
				</p>
			</div>
		</SettingsSection>
	);
}
