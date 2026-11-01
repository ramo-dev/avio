import {
	RiAlertLine,
	RiCheckboxCircleLine,
	RiTimeLine,
} from "@remixicon/react";
import { cn } from "cn";
import {
	SERVER_STATUS_META,
	type ServerServiceStatus,
} from "#/lib/xmpp/server-capability-view";

const TILE_TONES: Record<ServerServiceStatus, string> = {
	insecure: "bg-warning/15 text-warning",
	new: "bg-info/15 text-info",
	upcoming: "bg-info/10 text-info",
	active: "bg-success/15 text-success",
	unsupported: "bg-muted text-muted-foreground",
};

const PILL_TONES: Record<ServerServiceStatus, string> = {
	insecure: "bg-warning/10 text-warning ring-1 ring-inset ring-warning/30",
	new: "bg-info/10 text-info ring-1 ring-inset ring-info/30",
	upcoming: "bg-info/10 text-info ring-1 ring-inset ring-info/30",
	active: "bg-success/10 text-success ring-1 ring-inset ring-success/30",
	unsupported: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
};

/**
 * Filled status pills, icon tiles, and summary tiles. Colors come from the
 * semantic `success`/`warning`/`info` tokens in `src/styles/tokens.css`.
 */
export function StatusPill({
	status,
	label,
}: {
	status: ServerServiceStatus;
	label?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-4xl px-2.5 py-1 text-xs font-medium whitespace-nowrap",
				PILL_TONES[status],
			)}
		>
			{label ?? SERVER_STATUS_META[status].label}
		</span>
	);
}

export function StatusTile({
	status,
	children,
}: {
	status: ServerServiceStatus;
	children: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				"flex size-9 shrink-0 items-center justify-center rounded-lg",
				TILE_TONES[status],
			)}
		>
			{children}
		</div>
	);
}

const SUMMARY_STATUS = {
	active: "active",
	attention: "insecure",
	upcoming: "upcoming",
} as const satisfies Record<
	"active" | "attention" | "upcoming",
	ServerServiceStatus
>;

const SUMMARY_ICONS: Record<
	"active" | "attention" | "upcoming",
	typeof RiCheckboxCircleLine
> = {
	active: RiCheckboxCircleLine,
	attention: RiAlertLine,
	upcoming: RiTimeLine,
};

export function SummaryStat({
	label,
	value,
	status,
}: {
	label: string;
	value: number;
	status: "active" | "attention" | "upcoming";
}) {
	const Icon = SUMMARY_ICONS[status];
	return (
		<div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
			<StatusTile status={SUMMARY_STATUS[status]}>
				<Icon className="size-4" />
			</StatusTile>
			<div className="min-w-0">
				<p className="text-lg leading-none font-semibold tabular-nums">
					{value}
				</p>
				<p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
			</div>
		</div>
	);
}
