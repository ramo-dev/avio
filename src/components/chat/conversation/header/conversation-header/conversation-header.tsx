import { HeaderActions } from "#/components/chat/conversation/header/header-actions/header-actions";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { presenceDotClassName } from "#/lib/format/presence";
import { cn } from "#/lib/utils";
import { presenceLabel } from "#/lib/xmpp/presence";
import type { PresenceState } from "#/types/xmpp";

export function ConversationHeader({
	jid,
	name,
	presence,
	typing,
}: {
	jid: string;
	name: string;
	presence: PresenceState;
	typing: boolean;
}) {
	return (
		<header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
			<div className="relative">
				<UserAvatar jid={jid} name={name} />
				<span
					className={cn(
						"absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-background",
						presenceDotClassName(presence.show),
					)}
				/>
			</div>
			<div className="min-w-0 flex-1">
				<h2 className="truncate text-sm font-semibold">{name}</h2>
				<p className="truncate text-xs text-muted-foreground">
					{typing ? "typing…" : presence.status || presenceLabel(presence)}
				</p>
			</div>
			<HeaderActions jid={jid} />
		</header>
	);
}
