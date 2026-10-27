import type { PresenceShow } from "#/types/xmpp";

export function presenceDotClassName(show: PresenceShow): string {
	switch (show) {
		case "chat":
		case "available":
			return "bg-emerald-500";
		case "away":
		case "xa":
			return "bg-amber-500";
		case "dnd":
			return "bg-destructive";
		default:
			return "bg-muted-foreground/40";
	}
}
