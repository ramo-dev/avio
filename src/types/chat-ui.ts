import type { ConversationSummary } from "#/types/chat";

export type ChatFilter = "all" | "unread" | "favorites" | "archived";

export type ChatSort = "newest" | "oldest";

export interface ChatPreference {
	pinned: boolean;
	muted: boolean;
	favorite: boolean;
	archived: boolean;
}

export interface ConversationListItem extends ConversationSummary {
	preference: ChatPreference;
}
