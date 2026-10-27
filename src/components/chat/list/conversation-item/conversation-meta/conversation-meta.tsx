import { RiPushpinLine, RiStarFill, RiVolumeMuteLine } from "@remixicon/react";
import { Badge } from "#/components/ui/badge";
import { formatRelativeTime } from "#/lib/format/time";
import { cn } from "#/lib/utils";
import type { ConversationListItem } from "#/types/chat-ui";

export function ConversationMeta({
	item,
	selected,
	secondary,
}: {
	item: ConversationListItem;
	selected: boolean;
	secondary: string;
}) {
	return (
		<div className="flex shrink-0 flex-col items-end gap-1">
			<div className={cn("flex items-center gap-1 text-[0.7rem]", secondary)}>
				{item.preference.pinned && <RiPushpinLine className="size-3.5" />}
				{item.preference.muted && <RiVolumeMuteLine className="size-3.5" />}
				{item.preference.favorite && <RiStarFill className="size-3.5" />}
				{item.lastActivity > 0 && (
					<span>{formatRelativeTime(item.lastActivity)}</span>
				)}
			</div>
			{item.unread > 0 && (
				<Badge
					className={cn(
						"shrink-0",
						selected && "bg-primary-foreground text-primary",
					)}
				>
					{item.unread > 99 ? "99+" : item.unread}
				</Badge>
			)}
		</div>
	);
}
