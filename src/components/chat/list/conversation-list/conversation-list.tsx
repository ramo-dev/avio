import {
	RiArchiveLine,
	RiChat3Line,
	RiSearchLine,
	RiStarLine,
} from "@remixicon/react";
import { ConversationItem } from "#/components/chat/list/conversation-item/conversation-item";
import { CenteredEmptyState } from "#/components/common/centered-empty/centered-empty";
import { Button } from "#/components/ui/button";
import { ScrollArea } from "#/components/ui/scroll-area";
import type {
	ChatFilter,
	ChatPreference,
	ConversationListItem,
} from "#/types/chat-ui";

export function ConversationList({
	items,
	activeJid,
	searchQuery,
	filter,
	onClearSearch,
	onPreferenceChange,
	onMarkUnread,
	onDelete,
}: {
	items: ConversationListItem[];
	activeJid: string | null;
	searchQuery: string;
	filter: ChatFilter;
	onClearSearch: () => void;
	onPreferenceChange: (jid: string, patch: Partial<ChatPreference>) => void;
	onMarkUnread: (jid: string) => void;
	onDelete: (jid: string) => void;
}) {
	if (items.length === 0) {
		return (
			<div className="flex min-h-0 flex-1 items-center justify-center p-4">
				<CenteredEmptyState
					{...emptyState(searchQuery, filter, onClearSearch)}
				/>
			</div>
		);
	}

	return (
		<ScrollArea className="min-h-0 flex-1">
			<div
				role="listbox"
				aria-label="Conversations"
				className="flex flex-col gap-1 md:p-2 p-3"
				onKeyDown={handleListKeyDown}
			>
				{items.map((item) => (
					<ConversationItem
						key={item.jid}
						item={item}
						selected={item.jid === activeJid}
						onPreferenceChange={(patch) => onPreferenceChange(item.jid, patch)}
						onMarkUnread={() => onMarkUnread(item.jid)}
						onDelete={() => onDelete(item.jid)}
					/>
				))}
			</div>
		</ScrollArea>
	);
}

function emptyState(
	searchQuery: string,
	filter: ChatFilter,
	onClearSearch: () => void,
) {
	if (searchQuery) {
		return {
			icon: <RiSearchLine />,
			title: `No results for “${searchQuery}”`,
			description: "Try a different name or JID.",
			action: (
				<Button variant="outline" size="sm" onClick={onClearSearch}>
					Clear search
				</Button>
			),
		};
	}

	if (filter === "unread") {
		return {
			icon: <RiChat3Line />,
			title: "No unread conversations",
			description: "You're all caught up.",
		};
	}

	if (filter === "favorites") {
		return {
			icon: <RiStarLine />,
			title: "No starred chats",
			description: "Star a chat from its context menu to keep it here.",
		};
	}

	if (filter === "archived") {
		return {
			icon: <RiArchiveLine />,
			title: "No archived chats",
			description: "Archived conversations stay out of your main list.",
		};
	}

	return {
		icon: <RiChat3Line />,
		title: "No conversations yet",
		description: "Add a contact to start your first conversation.",
	};
}

function handleListKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
	const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
	if (!keys.includes(event.key)) return;

	const options = Array.from(
		event.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'),
	);
	if (options.length === 0) return;

	const current = options.indexOf(document.activeElement as HTMLElement);
	let next = current;

	if (event.key === "ArrowDown")
		next = Math.min(options.length - 1, current + 1);
	if (event.key === "ArrowUp") next = Math.max(0, current - 1);
	if (event.key === "Home") next = 0;
	if (event.key === "End") next = options.length - 1;
	if (current === -1) next = 0;

	options[next]?.focus();
	event.preventDefault();
}
