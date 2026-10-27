import { RiChatSmile2Line } from "@remixicon/react";
import { useMemo, useState } from "react";
import { AddContactDialog } from "#/components/chat/contacts/add-contact-dialog/add-contact-dialog";
import { AccountMenu } from "#/components/chat/sidebar/account-menu/account-menu";
import { ConnectionFooter } from "#/components/chat/sidebar/connection-footer/connection-footer";
import { RosterList } from "#/components/chat/sidebar/roster/roster-list/roster-list";
import { RosterSearch } from "#/components/chat/sidebar/roster-search/roster-search";
import { SubscriptionRequests } from "#/components/chat/sidebar/subscription-requests/subscription-requests";
import { useXmppState } from "#/hooks/xmpp/use-xmpp";
import { selectConversationSummaries } from "#/lib/xmpp/selectors";

export function ChatSidebar() {
	const state = useXmppState();
	const [search, setSearch] = useState("");

	const summaries = useMemo(() => {
		const query = search.trim().toLowerCase();
		const all = selectConversationSummaries(state);
		if (!query) return all;
		return all.filter(
			(summary) =>
				summary.name.toLowerCase().includes(query) ||
				summary.jid.toLowerCase().includes(query),
		);
	}, [search, state]);

	return (
		<div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
			<header className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
				<div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
					<RiChatSmile2Line className="size-4" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-semibold">Avio</p>
					<p className="truncate text-[0.7rem] text-muted-foreground">
						{state.account?.domain ?? "XMPP"}
					</p>
				</div>
				<AccountMenu />
			</header>

			<div className="flex shrink-0 items-center gap-2 p-3">
				<div className="min-w-0 flex-1">
					<RosterSearch value={search} onChange={setSearch} />
				</div>
				<AddContactDialog />
			</div>

			<SubscriptionRequests />
			<RosterList summaries={summaries} />
			<ConnectionFooter />
		</div>
	);
}
