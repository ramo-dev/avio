import {
	RiDownloadLine,
	RiErrorWarningLine,
	RiPlayFill,
} from "@remixicon/react";
import { useRef, useState } from "react";
import { MediaControls } from "#/components/chat/messages/media-controls/media-controls";
import { MediaPlaceholder } from "#/components/chat/messages/media-placeholder/media-placeholder";
import { Card } from "#/components/ui/card";
import { useMediaPlayer } from "#/hooks/use-media-player";
import { formatBytes } from "#/lib/chat/attachments";
import { cn } from "#/lib/utils";
import type { MessageAttachment } from "#/types/attachment";

export function MessageVideo({
	attachment,
}: {
	attachment: MessageAttachment;
}) {
	const mediaRef = useRef<HTMLVideoElement>(null);
	const [revealed, setRevealed] = useState(false);
	const player = useMediaPlayer(mediaRef, attachment.url, revealed);

	if (!revealed) {
		return (
			<MediaPlaceholder
				kind="video"
				name={attachment.name}
				size={attachment.size}
				onLoad={() => setRevealed(true)}
			/>
		);
	}

	function enterFullscreen() {
		const media = mediaRef.current;
		if (!media) return;

		if (document.fullscreenElement) {
			void document.exitFullscreen();
			return;
		}
		void media.requestFullscreen().catch(() => undefined);
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: media controls own the pointer gestures
		<div
			onPointerDown={(event) => event.stopPropagation()}
			onContextMenu={(event) => event.stopPropagation()}
		>
			<Card
				size="sm"
				className="w-full max-w-md gap-0 overflow-hidden border-border/60 bg-background p-0 text-foreground shadow-none"
			>
				{player.error ? (
					<div className="flex flex-col gap-2 p-3">
						<a
							href={attachment.url}
							download={attachment.name}
							target="_blank"
							rel="noreferrer"
							className="flex min-w-0 items-center gap-2"
						>
							<span className="grid size-8 shrink-0 place-items-center rounded bg-muted text-muted-foreground">
								<RiErrorWarningLine className="size-4" />
							</span>
							<span className="min-w-0 flex-1">
								<span className="block truncate text-sm font-medium">
									{attachment.name}
								</span>
								<span className="block text-xs text-muted-foreground">
									Playback unavailable
								</span>
							</span>
							<RiDownloadLine className="size-4 shrink-0 text-muted-foreground" />
						</a>
					</div>
				) : (
					<>
						<div className="relative bg-black">
							<video
								ref={mediaRef}
								src={attachment.url}
								preload="metadata"
								playsInline
								aria-label={attachment.name}
								className="max-h-72 w-full object-contain"
							>
								<track kind="captions" />
							</video>
							<button
								type="button"
								onClick={player.toggle}
								aria-label={player.playing ? "Pause video" : "Play video"}
								className={cn(
									"absolute inset-0 grid place-items-center transition-colors",
									player.playing ? "bg-transparent" : "bg-black/20 text-white",
								)}
							>
								{!player.playing && (
									<RiPlayFill className="size-10 drop-shadow" />
								)}
							</button>
						</div>

						<div className="flex items-center gap-2 border-t border-border/60 p-2">
							<MediaControls
								className="min-w-0 flex-1"
								currentTime={player.currentTime}
								duration={player.duration}
								playing={player.playing}
								muted={player.muted}
								onToggle={player.toggle}
								onSeek={player.seek}
								onToggleMuted={player.toggleMuted}
								onFullscreen={enterFullscreen}
							/>
						</div>
						<div className="flex min-w-0 items-center justify-between gap-2 px-2 pb-2">
							<p className="truncate text-xs text-muted-foreground">
								{attachment.name}
							</p>
							<span className="shrink-0 text-xs text-muted-foreground">
								{formatBytes(attachment.size) || "Video"}
							</span>
							<a
								href={attachment.url}
								download={attachment.name}
								target="_blank"
								rel="noreferrer"
								aria-label={`Download ${attachment.name}`}
								className="grid size-7 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
							>
								<RiDownloadLine className="size-3.5" />
							</a>
						</div>
					</>
				)}
			</Card>
		</div>
	);
}
