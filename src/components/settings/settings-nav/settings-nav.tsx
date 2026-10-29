import {
	RiChat3Line,
	RiNotification3Line,
	RiSunLine,
	RiVolumeUpLine,
} from "@remixicon/react";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

export type SettingsSectionId =
	| "appearance"
	| "sounds"
	| "chats"
	| "notifications";

const SECTIONS: Array<{
	id: SettingsSectionId;
	label: string;
	icon: typeof RiSunLine;
}> = [
	{ id: "appearance", label: "Appearance", icon: RiSunLine },
	{ id: "sounds", label: "Sounds", icon: RiVolumeUpLine },
	{ id: "chats", label: "Chats", icon: RiChat3Line },
	{ id: "notifications", label: "Notifications", icon: RiNotification3Line },
];

export function SettingsNav({
	value,
	onChange,
}: {
	value: SettingsSectionId;
	onChange: (section: SettingsSectionId) => void;
}) {
	return (
		<nav
			aria-label="Settings sections"
			className="flex gap-1 overflow-x-auto pb-1 md:w-44 md:shrink-0 md:flex-col md:overflow-visible md:pb-0"
		>
			{SECTIONS.map(({ id, label, icon: Icon }) => {
				const active = value === id;
				return (
					<Button
						key={id}
						type="button"
						variant={active ? "secondary" : "ghost"}
						aria-current={active ? "page" : undefined}
						onClick={() => onChange(id)}
						className={cn(
							"shrink-0 justify-start gap-2 md:w-full",
							!active && "text-muted-foreground",
						)}
					>
						<Icon className="size-4" />
						{label}
					</Button>
				);
			})}
		</nav>
	);
}
