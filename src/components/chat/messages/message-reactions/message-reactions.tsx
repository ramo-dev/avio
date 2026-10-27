import { useMemo } from "react";
import { cn } from "#/lib/utils";

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
				"flex flex-wrap gap-1",
				outgoing ? "justify-end" : "justify-start",
			)}
		>
			{groups.map(([emoji, users]) => {
				const mine = Boolean(currentUserJid && users.includes(currentUserJid));
				return (
					<button
						key={emoji}
						type="button"
						aria-pressed={mine}
						aria-label={`${emoji} ${users.length} reaction${users.length === 1 ? "" : "s"}`}
						title={users.join(", ")}
						onClick={() => onToggle?.(emoji)}
						className={cn(
							"flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs leading-none transition-colors",
							mine
								? "border-primary/40 bg-primary/10 text-foreground"
								: "border-border bg-muted/60 text-muted-foreground hover:bg-muted",
						)}
					>
						<span>{emoji}</span>
						<span>{users.length}</span>
					</button>
				);
			})}
		</div>
	);
}
