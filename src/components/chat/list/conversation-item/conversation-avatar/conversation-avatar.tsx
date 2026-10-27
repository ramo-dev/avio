import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { presenceDotClassName } from "#/lib/format/presence";
import { cn } from "#/lib/utils";
import type { ConversationSummary } from "#/types/chat";

export function ConversationAvatar({
	item,
	selected,
}: {
	item: ConversationSummary;
	selected: boolean;
}) {
	return (
		<div className="relative shrink-0">
			<UserAvatar
				jid={item.jid}
				name={item.name}
				className="size-12"
				size="lg"
			/>
			<span
				className={cn(
					"absolute -bottom-0.5 -left-0.5 size-3.5 rounded-full border-2",
					selected ? "border-muted" : "border-card",
					presenceDotClassName(item.presence.show),
				)}
			/>
		</div>
	);
}
