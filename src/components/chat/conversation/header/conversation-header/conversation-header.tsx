import {
	RiArrowLeftLine,
	RiGroupLine,
	RiLockUnlockLine,
} from "@remixicon/react";
import { HeaderActions } from "#/components/chat/conversation/header/header-actions/header-actions";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { presenceDotClassName } from "#/lib/format/presence";
import { formatLastSeen } from "#/lib/format/time";
import { cn } from "#/lib/utils";
import { presenceLabel } from "#/lib/xmpp/presence";
import { useRightSidebar } from "#/providers/right-sidebar-provider";
import type { ConversationKind } from "#/types/chat";
import type { PresenceState } from "#/types/xmpp";

export function ConversationHeader({
	jid,
	name,
	presence,
	kind,
	memberCount,
	memberPreview,
	typing,
	searchOpen,
	onToggleSearch,
	onBack,
}: {
	jid: string;
	name: string;
	presence: PresenceState;
	kind: ConversationKind;
	memberCount?: number;
	memberPreview?: boolean;
	typing: boolean;
	searchOpen: boolean;
	onToggleSearch: () => void;
	onBack?: () => void;
}) {
	const { open } = useRightSidebar();
	const isGroup = kind === "group";
	const status = isGroup
		? memberPreview
			? "Invite-only group"
			: memberCount === 1
				? "1 member"
				: `${memberCount ?? 0} members`
		: typing
			? "typing…"
			: presence.show === "offline" && presence.lastSeen
				? formatLastSeen(presence.lastSeen)
				: presence.status || presenceLabel(presence);

	function openInfo() {
		open(isGroup ? { kind: "room", jid } : { kind: "contact", jid });
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
					{isGroup ? (
						<span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
							<RiGroupLine className="size-5" />
						</span>
					) : (
						<>
							<UserAvatar jid={jid} name={name} />
							<span
								className={cn(
									"absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-background",
									presenceDotClassName(presence.show),
								)}
							/>
						</>
					)}
				</div>
				<div className="min-w-0">
					<div className="flex min-w-0 items-center gap-2">
						<h2 className="truncate text-sm font-semibold">{name}</h2>
						{isGroup && (
							<Tooltip>
								<TooltipTrigger
									render={
										<Badge
											variant="outline"
											className="shrink-0 gap-1 text-[10px] font-normal"
										>
											<RiLockUnlockLine className="size-3" />
											Not encrypted
										</Badge>
									}
								/>
								<TooltipContent>
									Group messages are sent without end-to-end encryption.
								</TooltipContent>
							</Tooltip>
						)}
					</div>
					<p className="truncate text-xs text-muted-foreground">{status}</p>
				</div>
			</button>

			<HeaderActions
				jid={jid}
				kind={kind}
				searchOpen={searchOpen}
				onToggleSearch={onToggleSearch}
				onOpenInfo={openInfo}
			/>
		</header>
	);
}
