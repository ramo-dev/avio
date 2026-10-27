import {
	RiArchiveLine,
	RiDeleteBin6Line,
	RiInboxUnarchiveLine,
	RiMailUnreadLine,
	RiPushpinLine,
	RiStarFill,
	RiStarLine,
	RiVolumeMuteLine,
} from "@remixicon/react";
import {
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
} from "#/components/ui/context-menu";
import type { ChatPreference } from "#/types/chat-ui";

export function ConversationMenu({
	preference,
	onPreferenceChange,
	onMarkUnread,
	onDelete,
}: {
	preference: ChatPreference;
	onPreferenceChange: (patch: Partial<ChatPreference>) => void;
	onMarkUnread: () => void;
	onDelete: () => void;
}) {
	return (
		<ContextMenuContent className="w-48">
			<ContextMenuItem
				onClick={() => onPreferenceChange({ pinned: !preference.pinned })}
			>
				<RiPushpinLine />
				{preference.pinned ? "Unpin" : "Pin"}
			</ContextMenuItem>
			<ContextMenuItem
				onClick={() => onPreferenceChange({ favorite: !preference.favorite })}
			>
				{preference.favorite ? <RiStarFill /> : <RiStarLine />}
				{preference.favorite ? "Unstar" : "Star"}
			</ContextMenuItem>
			<ContextMenuItem
				onClick={() => onPreferenceChange({ muted: !preference.muted })}
			>
				<RiVolumeMuteLine />
				{preference.muted ? "Unmute" : "Mute"}
			</ContextMenuItem>
			<ContextMenuItem onClick={onMarkUnread}>
				<RiMailUnreadLine />
				Mark unread
			</ContextMenuItem>
			<ContextMenuItem
				onClick={() => onPreferenceChange({ archived: !preference.archived })}
			>
				{preference.archived ? <RiInboxUnarchiveLine /> : <RiArchiveLine />}
				{preference.archived ? "Unarchive" : "Archive"}
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem variant="destructive" onClick={onDelete}>
				<RiDeleteBin6Line />
				Delete chat
			</ContextMenuItem>
		</ContextMenuContent>
	);
}
