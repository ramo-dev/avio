import { RiContactsBook3Line } from "@remixicon/react";
import { RosterItem } from "#/components/chat/sidebar/roster/roster-item/roster-item";
import { CenteredEmptyState } from "#/components/common/centered-empty/centered-empty";
import type { ConversationSummary } from "#/types/chat";

export function RosterList({
	summaries,
}: {
	summaries: ConversationSummary[];
}) {
	if (summaries.length === 0) {
		return (
			<CenteredEmptyState
				className="px-4"
				icon={<RiContactsBook3Line />}
				title="No contacts"
				description="Add a contact or wait for someone to reach out."
			/>
		);
	}

	return (
		<nav aria-label="Contacts" className="min-h-0 flex-1 overflow-y-auto p-2">
			<div className="flex flex-col gap-0.5">
				{summaries.map((summary) => (
					<RosterItem key={summary.jid} summary={summary} />
				))}
			</div>
		</nav>
	);
}
