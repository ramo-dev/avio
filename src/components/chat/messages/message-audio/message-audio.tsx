import {
	RiDownloadLine,
	RiErrorWarningLine,
	RiMusicLine,
} from "@remixicon/react";
import { useRef, useState } from "react";
import { MediaControls } from "#/components/chat/messages/media-controls/media-controls";
import { MediaPlaceholder } from "#/components/chat/messages/media-placeholder/media-placeholder";
import { Card } from "#/components/ui/card";
import { useMediaPlayer } from "#/hooks/use-media-player";
import { formatBytes } from "#/lib/chat/attachments";
import type { MessageAttachment } from "#/types/attachment";

export function MessageAudio({
	attachment,
}: {
	attachment: MessageAttachment;
}) {
	const mediaRef = useRef<HTMLAudioElement>(null);
	const [revealed, setRevealed] = useState(false);
	const player = useMediaPlayer(mediaRef, attachment.url, revealed);

	if (!revealed) {
		return (
			<MediaPlaceholder
				kind="audio"
				name={attachment.name}
				size={attachment.size}
				onLoad={() => setRevealed(true)}
			/>
		);
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: media controls own the pointer gestures
		<div
			onPointerDown={(event) => event.stopPropagation()}
			onContextMenu={(event) => event.stopPropagation()}
		>
			<Card
				size="sm"
				className="w-full max-w-sm gap-2 border-border/60 bg-background p-2.5 text-foreground shadow-none"
			>
				<audio
					ref={mediaRef}
					src={attachment.url}
					preload="metadata"
					className="hidden"
				>
					<track kind="captions" />
				</audio>

				<div className="flex min-w-0 items-center gap-2">
					<span className="grid size-8 shrink-0 place-items-center rounded bg-muted text-muted-foreground">
						<RiMusicLine className="size-4" />
					</span>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium">{attachment.name}</p>
						<p className="text-xs text-muted-foreground">
							{formatBytes(attachment.size) || "Audio"}
						</p>
					</div>
					<a
						href={attachment.url}
						download={attachment.name}
						target="_blank"
						rel="noreferrer"
						aria-label={`Download ${attachment.name}`}
						className="grid size-8 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					>
						<RiDownloadLine className="size-4" />
					</a>
				</div>

				{player.error ? (
					<p className="flex items-center gap-1.5 text-xs text-destructive">
						<RiErrorWarningLine className="size-3.5 shrink-0" />
						Playback unavailable. Download the file instead.
					</p>
				) : (
					<MediaControls
						currentTime={player.currentTime}
						duration={player.duration}
						playing={player.playing}
						muted={player.muted}
						onToggle={player.toggle}
						onSeek={player.seek}
						onToggleMuted={player.toggleMuted}
					/>
				)}
			</Card>
		</div>
	);
}
