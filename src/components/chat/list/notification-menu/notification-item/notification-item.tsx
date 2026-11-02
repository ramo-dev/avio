import { RiGroupLine } from "@remixicon/react";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { Button } from "#/components/ui/button";
import { formatRelativeTime } from "#/lib/format/time";
import { cn } from "#/lib/utils";
import type { StoredNotification } from "#/types/notification";

export function NotificationItem({
	item,
	onOpen,
	onAccept,
	onDecline,
}: {
	item: StoredNotification;
	onOpen: () => void;
	onAccept: () => void;
	onDecline: () => void;
}) {
	return (
		<article
			className={cn(
				"rounded-xl bg-card px-3 py-3 transition-colors hover:bg-muted/50",
				!item.read && "ring-1 ring-primary/15",
			)}
		>
			<button
				type="button"
				onClick={onOpen}
				className="flex w-full min-w-0 items-start gap-3 text-left"
			>
				{renderVisual(item)}
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="flex min-w-0 items-start justify-between gap-3">
						<span className="min-w-0 truncate text-sm font-medium">
							{item.name}
						</span>
						<span className="flex shrink-0 items-center gap-2">
							<span className="whitespace-nowrap text-[0.65rem] text-muted-foreground">
								{formatRelativeTime(item.timestamp)}
							</span>
							{!item.read && (
								<span className="size-2 rounded-full bg-primary">
									<span className="sr-only">Unread</span>
								</span>
							)}
						</span>
					</span>
					<span className="line-clamp-2 text-xs text-muted-foreground">
						{item.body}
					</span>
				</span>
			</button>

			{item.invite && (
				<div className="mt-2 flex flex-wrap gap-2 pl-12">
					<Button size="xs" variant="ghost" onClick={onOpen}>
						Preview
					</Button>
					<Button size="xs" onClick={onAccept}>
						Accept
					</Button>
					<Button size="xs" variant="ghost" onClick={onDecline}>
						Decline
					</Button>
				</div>
			)}
		</article>
	);
}

function renderVisual(item: StoredNotification) {
	if (item.kind === "group") {
		return (
			<span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
				<RiGroupLine className="size-4" />
			</span>
		);
	}

	return (
		<UserAvatar jid={item.jid} name={item.name} className="size-9 shrink-0" />
	);
}
