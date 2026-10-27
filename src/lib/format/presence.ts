import type { PresenceShow } from "#/types/xmpp";

export function presenceDotClassName(show: PresenceShow): string {
	switch (show) {
		case "chat":
		case "available":
			return "bg-green-500";
		case "away":
			return "bg-zinc-500";
		case "xa":
			return "bg-muted-foreground";
		case "dnd":
			return "bg-destructive";
		default:
			return "bg-muted-foreground";
	}
}
