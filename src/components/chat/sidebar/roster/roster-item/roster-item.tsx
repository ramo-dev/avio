import { Link } from "@tanstack/react-router";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { presenceDotClassName } from "#/lib/format/presence";
import { formatRelativeTime } from "#/lib/format/time";
import { cn } from "#/lib/utils";
import type { ConversationSummary } from "#/types/chat";

export function RosterItem({ summary }: { summary: ConversationSummary }) {
	return (
		<Link
			to="/chat/$jid"
			params={{ jid: summary.jid }}
			className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent"
			activeProps={{ className: "bg-sidebar-accent" }}
		>
			<div className="relative">
				<UserAvatar jid={summary.jid} name={summary.name} />
				<span
					className={cn(
						"absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-sidebar",
						presenceDotClassName(summary.presence.show),
					)}
				/>
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-baseline justify-between gap-2">
					<span className="truncate text-sm font-medium">{summary.name}</span>
					{summary.lastActivity > 0 && (
						<span className="shrink-0 text-[0.7rem] text-muted-foreground">
							{formatRelativeTime(summary.lastActivity)}
						</span>
					)}
				</div>
				<p className="truncate text-xs text-muted-foreground">
					{summary.lastMessage?.body || summary.jid}
				</p>
			</div>
			{summary.unread > 0 && (
				<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[0.7rem] font-medium text-primary-foreground">
					{summary.unread > 9 ? "9+" : summary.unread}
				</span>
			)}
		</Link>
	);
}
