import { useEffect, useMemo, useRef, useState } from "react";
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
	const [displayGroups, setDisplayGroups] = useState(groups);
	const [leaving, setLeaving] = useState<Set<string>>(() => new Set());
	const previousGroups = useRef(groups);

	useEffect(() => {
		const next = new Set(groups.map(([emoji]) => emoji));
		const removed = previousGroups.current.filter(
			([emoji]) => !next.has(emoji),
		);

		if (removed.length === 0) {
			previousGroups.current = groups;
			setDisplayGroups(groups);
			return;
		}

		setDisplayGroups([...groups, ...removed]);
		setLeaving(new Set(removed.map(([emoji]) => emoji)));
		const timer = setTimeout(() => {
			previousGroups.current = groups;
			setDisplayGroups(groups);
			setLeaving(new Set());
		}, 150);
		return () => clearTimeout(timer);
	}, [groups]);

	if (displayGroups.length === 0) return null;

	return (
		<div
			data-slot="message-reactions"
			className={cn(
				"flex flex-wrap -mt-3 items-center gap-y-1 -space-x-1",
				outgoing ? "justify-end" : "justify-start",
			)}
		>
			{displayGroups.map(([emoji, users]) => {
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
							"relative z-0 flex size-7 shrink-0 items-center justify-center rounded-full border text-sm leading-none transition-[transform,background-color,border-color] duration-150 hover:z-10 active:scale-90 focus-visible:z-10",
							leaving.has(emoji)
								? "pointer-events-none"
								: "animate-in fade-in-0 zoom-in-75 duration-150",
							mine
								? "border-primary/40 bg-muted text-foreground"
								: "border-border bg-muted text-muted-foreground hover:bg-muted",
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

				const content =
					users.length === 1 ? (
						chip
					) : (
						<Tooltip>
							<TooltipTrigger render={chip} />
							<TooltipContent>{names}</TooltipContent>
						</Tooltip>
					);

				return (
					<span
						key={emoji}
						className={cn(
							"inline-flex shrink-0 transition-[width,opacity,transform,margin] duration-200 ease-out",
							leaving.has(emoji)
								? "-ml-1 w-0 scale-75 opacity-0"
								: "w-7 scale-100 opacity-100",
						)}
					>
						{content}
					</span>
				);
			})}
		</div>
	);
}
