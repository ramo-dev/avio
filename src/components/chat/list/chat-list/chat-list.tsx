import { useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChatFilters } from "#/components/chat/list/chat-filters/chat-filters";
import { ChatSearch } from "#/components/chat/list/chat-search/chat-search";
import { ConversationList } from "#/components/chat/list/conversation-list/conversation-list";
import { ChatListHeader } from "#/components/chat/list/header/chat-list-header";
import { RoomInviteRequests } from "#/components/chat/list/room-invite-requests/room-invite-requests";
import { SubscriptionRequests } from "#/components/chat/list/subscription-requests/subscription-requests";
import { useChatPreferences } from "#/hooks/use-chat-preferences";
import { useDebouncedValue } from "#/hooks/use-debounced-value";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";
import { selectConversationSummaries } from "#/lib/xmpp/selectors";
import type { ChatFilter, ChatSort } from "#/types/chat-ui";

export function ChatList() {
	const state = useXmppState();
	const actions = useXmppActions();
	const navigate = useNavigate();
	const params = useParams({ strict: false }) as {
		jid?: string;
		room?: string;
	};
	const { getPreference, updatePreference } = useChatPreferences(
		state.account?.bareJid ?? null,
	);
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<ChatFilter>("all");
	const [sort, setSort] = useState<ChatSort>("newest");
	const debouncedSearch = useDebouncedValue(search, 200);
	const activeJid = params.room ?? params.jid ?? null;

	const allSummaries = useMemo(
		() => selectConversationSummaries(state),
		[state],
	);

	const items = useMemo(() => {
		const query = debouncedSearch.trim().toLowerCase();
		const filtered = allSummaries
			.map((summary) => ({
				...summary,
				preference: getPreference(summary.jid),
			}))
			.filter((item) => {
				if (filter === "archived") {
					return item.preference.archived;
				}
				if (item.preference.archived) return false;
				if (filter === "unread") return item.unread > 0;
				if (filter === "favorites") return item.preference.favorite;
				return true;
			})
			.filter((item) => {
				if (!query) return true;
				return (
					item.name.toLowerCase().includes(query) ||
					item.jid.toLowerCase().includes(query) ||
					item.lastMessage?.body.toLowerCase().includes(query)
				);
			});

		return filtered.sort((a, b) => {
			if (a.preference.pinned !== b.preference.pinned) {
				return a.preference.pinned ? -1 : 1;
			}
			return sort === "newest"
				? b.lastActivity - a.lastActivity
				: a.lastActivity - b.lastActivity;
		});
	}, [allSummaries, debouncedSearch, filter, getPreference, sort]);

	function handleDelete(jid: string) {
		actions.deleteConversation(jid);
		if (activeJid === jid) {
			navigate({ to: "/chat" });
		}
	}

	return (
		<div className="flex h-full min-h-0 flex-col bg-card text-card-foreground">
			<ChatListHeader count={allSummaries.length} />

			<div className="shrink-0 md:px-2 px-3 pt-3">
				<ChatSearch value={search} onChange={setSearch} />
			</div>

			<ChatFilters
				filter={filter}
				sort={sort}
				onFilterChange={setFilter}
				onSortChange={setSort}
			/>

			<SubscriptionRequests />
			<RoomInviteRequests />

			<ConversationList
				items={items}
				activeJid={activeJid}
				searchQuery={debouncedSearch.trim()}
				filter={filter}
				onClearSearch={() => setSearch("")}
				onPreferenceChange={(jid, patch) => updatePreference(jid, patch)}
				onMarkUnread={(jid) => actions.markConversationUnread(jid)}
				onDelete={handleDelete}
			/>

			{/*<ConnectionFooter />*/}
		</div>
	);
}
