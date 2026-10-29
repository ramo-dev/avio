import { Link } from "@tanstack/react-router";
import { cva } from "class-variance-authority";
import { ConversationAvatar } from "#/components/chat/list/conversation-item/conversation-avatar/conversation-avatar";
import { ConversationMenu } from "#/components/chat/list/conversation-item/conversation-menu/conversation-menu";
import { ConversationMeta } from "#/components/chat/list/conversation-item/conversation-meta/conversation-meta";
import { ConversationPreview } from "#/components/chat/list/conversation-item/conversation-preview/conversation-preview";
import { ContextMenu, ContextMenuTrigger } from "#/components/ui/context-menu";
import { cn } from "#/lib/utils";
import type { ChatPreference, ConversationListItem } from "#/types/chat-ui";

const conversationItemVariants = cva(
	"group relative flex w-full shadow border bg-card min-w-0 items-center gap-3 rounded-xl p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
	{
		variants: {
			state: {
				default: "hover:bg-accent focus-visible:bg-accent",
				selected: "bg-primary/90 text-primary-foreground",
			},
		},
		defaultVariants: {
			state: "default",
		},
	},
);

export function ConversationItem({
	item,
	selected,
	onPreferenceChange,
	onMarkUnread,
	onDelete,
}: {
	item: ConversationListItem;
	selected: boolean;
	onPreferenceChange: (patch: Partial<ChatPreference>) => void;
	onMarkUnread: () => void;
	onDelete: () => void;
}) {
	const secondary = selected
		? "text-primary-foreground/70"
		: "text-muted-foreground";
	const link =
		item.kind === "group"
			? ({ to: "/chat/group/$room", params: { room: item.jid } } as const)
			: ({ to: "/chat/$jid", params: { jid: item.jid } } as const);

	return (
		<ContextMenu>
			<ContextMenuTrigger
				render={
					<Link
						{...link}
						role="option"
						aria-selected={selected}
						className={conversationItemVariants({
							state: selected ? "selected" : "default",
						})}
					/>
				}
			>
				<ConversationAvatar item={item} selected={selected} />

				<div className="min-w-0 flex-1">
					<div className="flex items-baseline justify-between gap-2">
						<span
							className={cn(
								"truncate text-sm",
								item.unread > 0 ? "font-semibold" : "font-medium",
							)}
						>
							{item.name}
						</span>
					</div>
					<div
						className={cn("flex min-w-0 items-center gap-1 text-xs", secondary)}
					>
						<ConversationPreview item={item} selected={selected} />
					</div>
				</div>

				<ConversationMeta
					item={item}
					selected={selected}
					secondary={secondary}
				/>
			</ContextMenuTrigger>

			<ConversationMenu
				preference={item.preference}
				onPreferenceChange={onPreferenceChange}
				onMarkUnread={onMarkUnread}
				onDelete={onDelete}
			/>
		</ContextMenu>
	);
}
