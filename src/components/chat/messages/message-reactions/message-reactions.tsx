import { useMemo } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";
import { displayJidName } from "#/lib/xmpp/jid";

export function MessageReactions({
	reactions,
	currentUserJid,
	outgoing,
	onToggle,
}: {
	reactions: Record<string, string[]>;
	currentUserJid?: string;
	outgoing: boolean;
	onToggle?: (emoji: string) => void;
}) {
	const groups = useMemo(() => {
		const byEmoji = new Map<string, string[]>();
		for (const [jid, emojis] of Object.entries(reactions)) {
			for (const emoji of emojis) {
				const users = byEmoji.get(emoji) ?? [];
				users.push(jid);
				byEmoji.set(emoji, users);
			}
		}
		return Array.from(byEmoji.entries());
	}, [reactions]);

	if (groups.length === 0) return null;

	return (
		<div
			data-slot="message-reactions"
			className={cn(
				"flex flex-wrap items-center gap-y-1 -space-x-1",
				outgoing ? "justify-end" : "justify-start",
			)}
		>
			{groups.map(([emoji, users]) => {
				const mine = Boolean(currentUserJid && users.includes(currentUserJid));
				const names = users
					.map((jid) => (jid === currentUserJid ? "You" : displayJidName(jid)))
					.join(", ");
				const chip = (
					<button
						type="button"
						aria-pressed={mine}
						aria-label={`${emoji} ${users.length} reaction${users.length === 1 ? "" : "s"}`}
						onClick={() => onToggle?.(emoji)}
						className={cn(
							"relative z-0 flex size-7 shrink-0 items-center justify-center rounded-full border text-sm leading-none transition-colors hover:z-10 focus-visible:z-10",
							mine
								? "border-primary/40 bg-primary/10 text-foreground"
								: "border-border bg-muted/60 text-muted-foreground hover:bg-muted",
						)}
					>
						<span>{emoji}</span>
						{users.length > 1 && (
							<span className="absolute -top-1.5 left-1/2 flex size-4 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-[9px] font-medium leading-none text-primary-foreground ring-2 ring-background">
								{users.length}
							</span>
						)}
					</button>
				);

				if (users.length === 1) {
					return <span key={emoji}>{chip}</span>;
				}
				return (
					<Tooltip key={emoji}>
						<TooltipTrigger render={chip} />
						<TooltipContent>{names}</TooltipContent>
					</Tooltip>
				);
			})}
		</div>
	);
}
