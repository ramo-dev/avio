import { Spinner } from "#/components/ui/spinner";
import { cn } from "#/lib/utils";
import type { ConnectionStatus } from "#/types/xmpp";

const LABELS: Record<ConnectionStatus, string> = {
	idle: "Offline",
	connecting: "Connecting",
	connected: "Online",
	reconnecting: "Reconnecting",
	disconnected: "Disconnected",
	error: "Connection error",
};

const DOTS: Record<ConnectionStatus, string> = {
	idle: "bg-muted-foreground/40",
	connecting: "bg-amber-500",
	connected: "bg-emerald-500",
	reconnecting: "bg-amber-500",
	disconnected: "bg-muted-foreground/40",
	error: "bg-destructive",
};

export function ConnectionBadge({
	status,
	className,
}: {
	status: ConnectionStatus;
	className?: string;
}) {
	const busy = status === "connecting" || status === "reconnecting";

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 text-xs text-muted-foreground",
				className,
			)}
		>
			{busy ? (
				<Spinner className="size-3" />
			) : (
				<span className={cn("size-1.5 rounded-full", DOTS[status])} />
			)}
			{LABELS[status]}
		</span>
	);
}
