import {
	RiFullscreenLine,
	RiPauseFill,
	RiPlayFill,
	RiVolumeMuteLine,
	RiVolumeUpLine,
} from "@remixicon/react";
import { Button } from "#/components/ui/button";
import { Slider } from "#/components/ui/slider";
import { formatDuration } from "#/lib/format/time";
import { cn } from "#/lib/utils";

export function MediaControls({
	currentTime,
	duration,
	playing,
	muted,
	onToggle,
	onSeek,
	onToggleMuted,
	onFullscreen,
	className,
}: {
	currentTime: number;
	duration: number;
	playing: boolean;
	muted: boolean;
	onToggle: () => void;
	onSeek: (value: number) => void;
	onToggleMuted?: () => void;
	onFullscreen?: () => void;
	className?: string;
}) {
	const max = duration > 0 ? duration : 1;

	return (
		<div className={cn("flex min-w-0 items-center gap-1.5", className)}>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label={playing ? "Pause" : "Play"}
				onClick={onToggle}
			>
				{playing ? (
					<RiPauseFill className="size-4" />
				) : (
					<RiPlayFill className="size-4" />
				)}
			</Button>

			<span className="w-8 shrink-0 text-right text-[0.7rem] tabular-nums text-muted-foreground">
				{formatDuration(currentTime)}
			</span>

			<Slider
				className="min-w-0 flex-1"
				aria-label="Seek"
				value={[Math.min(currentTime, max)]}
				min={0}
				max={max}
				step={0.1}
				disabled={duration <= 0}
				onValueChange={(value) => {
					const next = Array.isArray(value) ? value[0] : value;
					if (typeof next === "number") onSeek(next);
				}}
			/>

			<span className="w-8 shrink-0 text-[0.7rem] tabular-nums text-muted-foreground">
				{formatDuration(duration)}
			</span>

			{onToggleMuted && (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label={muted ? "Unmute" : "Mute"}
					onClick={onToggleMuted}
				>
					{muted ? (
						<RiVolumeMuteLine className="size-4" />
					) : (
						<RiVolumeUpLine className="size-4" />
					)}
				</Button>
			)}

			{onFullscreen && (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label="Enter fullscreen"
					onClick={onFullscreen}
				>
					<RiFullscreenLine className="size-4" />
				</Button>
			)}
		</div>
	);
}
