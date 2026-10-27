import {
	RiDownloadLine,
	RiFileLine,
	RiFileWarningLine,
	RiImageLine,
	RiVideoLine,
} from "@remixicon/react";
import { useState } from "react";
import { Card } from "#/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "#/components/ui/dialog";
import { formatBytes } from "#/lib/chat/attachments";
import { cn } from "#/lib/utils";
import type { MessageAttachment } from "#/types/attachment";

export function MessageAttachments({
	attachments,
	outgoing,
}: {
	attachments: MessageAttachment[];
	outgoing: boolean;
}) {
	const [active, setActive] = useState<MessageAttachment | null>(null);
	const [failed, setFailed] = useState<Record<string, boolean>>({});

	if (attachments.length === 0) return null;

	function markFailed(id: string) {
		setFailed((current) => ({ ...current, [id]: true }));
	}

	return (
		<>
			<div className="mt-2 flex flex-col gap-2">
				{attachments.map((attachment) => {
					const isFailed = failed[attachment.id];
					if (attachment.kind === "image" && !isFailed) {
						return (
							<button
								key={attachment.id}
								type="button"
								onClick={() => setActive(attachment)}
								className="overflow-hidden rounded border border-border/40"
								aria-label={`Open ${attachment.name}`}
							>
								<img
									src={attachment.url}
									alt={attachment.name}
									loading="lazy"
									onError={() => markFailed(attachment.id)}
									className="max-h-72 w-full object-cover"
								/>
							</button>
						);
					}

					if (attachment.kind === "video" && !isFailed) {
						return (
							<Card key={attachment.id} size="sm" className="p-2">
								<video
									src={attachment.url}
									controls
									onError={() => markFailed(attachment.id)}
									className="max-h-72 w-full rounded-lg"
								>
									<track kind="captions" />
								</video>
							</Card>
						);
					}

					const Icon = isFailed
						? RiFileWarningLine
						: attachment.kind === "image"
							? RiImageLine
							: attachment.kind === "video"
								? RiVideoLine
								: RiFileLine;

					return (
						<a
							key={attachment.id}
							href={attachment.url}
							download={attachment.name}
							target="_blank"
							rel="noreferrer"
							className="w-fit max-w-full"
						>
							<Card
								size="sm"
								className={cn(
									"w-48 bg-inherit rounded-md max-w-full flex-row items-center gap-2.5 p-2.5 transition-colors",
									outgoing
										? "border-primary-foreground/20 bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/20"
										: "hover:bg-muted/60",
								)}
							>
								<span className="grid size-9 shrink-0 place-items-center rounded bg-background/15 text-current">
									<Icon className="size-4" />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-medium">
										{attachment.name}
									</span>
									<span className="block truncate text-xs opacity-70">
										{isFailed
											? "Preview unavailable"
											: formatBytes(attachment.size) || "Attachment"}
									</span>
								</span>
								<RiDownloadLine className="size-4 shrink-0 opacity-70" />
							</Card>
						</a>
					);
				})}
			</div>

			<Dialog
				open={active !== null}
				onOpenChange={(open) => {
					if (!open) setActive(null);
				}}
			>
				<DialogContent className="max-w-3xl gap-3 p-3 sm:max-w-3xl">
					<DialogTitle className="flex items-center gap-2 truncate pr-8 text-sm font-medium">
						<RiImageLine className="size-4" />
						{active?.name}
					</DialogTitle>
					{active && (
						<img
							src={active.url}
							alt={active.name}
							className="max-h-[75dvh] w-full rounded-lg object-contain"
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
