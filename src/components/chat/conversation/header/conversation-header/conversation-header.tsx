import { RiArrowLeftLine } from "@remixicon/react";
import { ContactInfoPanel } from "#/components/chat/conversation/header/contact-info-panel/contact-info-panel";
import { HeaderActions } from "#/components/chat/conversation/header/header-actions/header-actions";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { Button } from "#/components/ui/button";
import { presenceDotClassName } from "#/lib/format/presence";
import { formatLastSeen } from "#/lib/format/time";
import { cn } from "#/lib/utils";
import { presenceLabel } from "#/lib/xmpp/presence";
import { useRightSidebar } from "#/providers/right-sidebar-provider";
import type { PresenceState } from "#/types/xmpp";

export function ConversationHeader({
	jid,
	name,
	presence,
	typing,
	searchOpen,
	onToggleSearch,
	onBack,
}: {
	jid: string;
	name: string;
	presence: PresenceState;
	typing: boolean;
	searchOpen: boolean;
	onToggleSearch: () => void;
	onBack?: () => void;
}) {
	const { open } = useRightSidebar();
	const status = typing
		? "typing…"
		: presence.show === "offline" && presence.lastSeen
			? formatLastSeen(presence.lastSeen)
			: presence.status || presenceLabel(presence);

	function openInfo() {
		open({
			title: "Contact info",
			description: "Direct XMPP conversation",
			content: <ContactInfoPanel jid={jid} />,
		});
	}

	return (
		<header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
			{onBack && (
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="Back to conversations"
					onClick={onBack}
				>
					<RiArrowLeftLine />
				</Button>
			)}

			<button
				type="button"
				onClick={openInfo}
				className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
			>
				<div className="relative shrink-0">
					<UserAvatar jid={jid} name={name} />
					<span
						className={cn(
							"absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-background",
							presenceDotClassName(presence.show),
						)}
					/>
				</div>
				<div className="min-w-0">
					<h2 className="truncate text-sm font-semibold">{name}</h2>
					<p className="truncate text-xs text-muted-foreground">{status}</p>
				</div>
			</button>

			<HeaderActions
				jid={jid}
				searchOpen={searchOpen}
				onToggleSearch={onToggleSearch}
				onOpenInfo={openInfo}
			/>
		</header>
	);
}
