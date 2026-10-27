import { RiCloseLine, RiFileLine, RiPlayFill } from "@remixicon/react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "#/components/ui/dialog";
import { Progress } from "#/components/ui/progress";
import { formatBytes } from "#/lib/chat/attachments";
import { cn } from "#/lib/utils";
import type { StagedFile } from "#/types/attachment";

type AttachmentTrayProps = {
	items: StagedFile[];
	onRemove: (id: string) => void;
	className?: string;
};

export function AttachmentTray({
	items,
	onRemove,
	className,
}: AttachmentTrayProps) {
	const [active, setActive] = useState<StagedFile | null>(null);

	return (
		<>
			<ul
				aria-label="Attachments"
				className={cn("flex gap-2 overflow-x-auto pb-1", className)}
			>
				{items.map((item) => {
					const { id, file, kind, previewUrl } = item;
					const previewable = kind !== "file" && previewUrl !== null;
					return (
						<li
							key={id}
							className="group relative shrink-0 animate-in fade-in-0 zoom-in-95 duration-150"
						>
							<button
								type="button"
								disabled={!previewable}
								onClick={() => setActive(item)}
								aria-label={previewable ? `Preview ${file.name}` : file.name}
								className={cn(
									"relative flex overflow-hidden rounded-md border border-border bg-muted text-left outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50",
									previewable
										? "size-16 cursor-zoom-in"
										: "h-16 max-w-52 cursor-default items-center gap-2 px-3",
								)}
							>
								{kind === "image" && previewUrl && (
									<img
										src={previewUrl}
										alt=""
										className="size-full object-cover"
									/>
								)}
								{kind === "video" && previewUrl && (
									<>
										<video
											src={previewUrl}
											muted
											preload="metadata"
											className="size-full object-cover"
										/>
										<span className="absolute inset-0 grid place-items-center bg-background/30">
											<RiPlayFill className="size-6 text-foreground" />
										</span>
									</>
								)}
								{kind === "file" && (
									<>
										<RiFileLine className="size-5 shrink-0 text-muted-foreground" />
										<span className="min-w-0">
											<span className="block truncate text-xs font-medium">
												{file.name}
											</span>
											<span className="block text-xs text-muted-foreground">
												{formatBytes(file.size)}
											</span>
										</span>
									</>
								)}
							</button>
							{item.uploading && (
								<div className="pointer-events-none absolute inset-x-1 bottom-1">
									<Progress value={item.progress ?? 0} className="h-1" />
								</div>
							)}
							<Button
								type="button"
								variant="secondary"
								size="icon"
								disabled={item.uploading}
								onClick={() => onRemove(id)}
								aria-label={`Remove ${file.name}`}
								className="absolute -right-1.5 -top-1.5 size-5 rounded-full z-50 border border-border opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100"
							>
								<RiCloseLine className="size-3" />
							</Button>
						</li>
					);
				})}
			</ul>

			<Dialog
				open={active !== null}
				onOpenChange={(open) => {
					if (!open) setActive(null);
				}}
			>
				<DialogContent className="max-w-3xl gap-3 p-3 sm:max-w-3xl">
					<DialogTitle className="truncate pr-8 text-sm font-medium">
						{active?.file.name}
					</DialogTitle>
					{active?.kind === "image" && active.previewUrl && (
						<img
							src={active.previewUrl}
							alt={active.file.name}
							className="max-h-[70dvh] w-full rounded-lg object-contain"
						/>
					)}
					{active?.kind === "video" && active.previewUrl && (
						<video
							src={active.previewUrl}
							controls
							className="max-h-[70dvh] w-full rounded-lg"
						>
							<track kind="captions" />
						</video>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
