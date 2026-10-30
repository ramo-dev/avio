import { RiGroupLine } from "@remixicon/react";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { presenceDotClassName } from "#/lib/format/presence";
import { cn } from "#/lib/utils";
import type { ConversationSummary } from "#/types/chat";

export function ConversationAvatar({
	item,
	selected,
}: {
	item: ConversationSummary;
	selected: boolean;
}) {
	if (item.kind === "group") {
		const participants = item.participants ?? [];
		const remaining = Math.max(
			0,
			(item.memberCount ?? participants.length) - participants.length,
		);

		if (participants.length <= 1) {
			return (
				<div className="relative shrink-0">
					<span
						className={cn(
							"grid size-10 border-2 place-items-center rounded-full",
							selected
								? "bg-card border-secondary text-primary-foreground"
								: "bg-muted border-input  text-muted-foreground",
						)}
					>
						<RiGroupLine className="size-4 text-foreground/50" />
					</span>
				</div>
			);
		}

		return (
			<div className="relative flex shrink-0 -space-x-2">
				{participants.map((participant) => (
					<UserAvatar
						key={participant.jid ?? participant.name}
						jid={participant.jid ?? participant.name}
						name={participant.name}
						className={cn(
							"size-8 ring-2",
							selected ? "ring-primary" : "ring-card",
						)}
					/>
				))}
				{remaining > 0 && (
					<span
						className={cn(
							"grid size-8 place-items-center rounded-full text-[10px] font-medium ring-2",
							selected
								? "bg-primary-foreground/15 text-primary-foreground ring-primary"
								: "bg-muted text-muted-foreground ring-card",
						)}
					>
						+{remaining}
					</span>
				)}
			</div>
		);
	}

	return (
		<div className="relative shrink-0">
			<UserAvatar
				jid={item.jid}
				name={item.name}
				className="size-12"
				size="lg"
			/>
			<span
				className={cn(
					"absolute -bottom-0.5 -left-0.5 size-3.5 rounded-full border-2",
					selected ? "border-muted" : "border-card",
					presenceDotClassName(item.presence.show),
				)}
			/>
		</div>
	);
}
