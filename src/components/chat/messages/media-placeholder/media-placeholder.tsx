import {
	RiEyeLine,
	RiImageLine,
	RiMusicLine,
	RiVideoLine,
} from "@remixicon/react";
import { Card } from "#/components/ui/card";
import { formatBytes } from "#/lib/chat/attachments";
import { cn } from "#/lib/utils";

const ICONS = {
	image: RiImageLine,
	video: RiVideoLine,
	audio: RiMusicLine,
};

const LABELS = {
	image: "Image",
	video: "Video",
	audio: "Audio",
};

/**
 * Stand-in for remote media that has not been fetched yet. Clicking is the
 * explicit opt-in to contact the sender's file host, so messages never leak the
 * reader's IP or read time without an action.
 */
export function MediaPlaceholder({
	kind,
	name,
	size,
	onLoad,
	className,
}: {
	kind: keyof typeof ICONS;
	name: string;
	size?: number;
	onLoad: () => void;
	className?: string;
}) {
	const Icon = ICONS[kind];
	return (
		<button
			type="button"
			onClick={onLoad}
			aria-label={`Load ${kind}: ${name}`}
			className={cn("w-full max-w-md text-left", className)}
		>
			<Card
				size="sm"
				className="flex-row items-center gap-2.5 border-border/60 bg-background p-2.5 text-foreground shadow-none transition-colors hover:bg-muted/60"
			>
				<span className="grid size-9 shrink-0 place-items-center rounded bg-muted text-muted-foreground">
					<Icon className="size-4" />
				</span>
				<span className="min-w-0 flex-1">
					<span className="block truncate text-sm font-medium">{name}</span>
					<span className="block truncate text-xs text-muted-foreground">
						{formatBytes(size) || LABELS[kind]} · Tap to load
					</span>
				</span>
				<span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
					<RiEyeLine className="size-4" />
					Load
				</span>
			</Card>
		</button>
	);
}
