import { formatDayLabel } from "#/lib/format/time";

export function DaySeparator({ timestamp }: { timestamp: number }) {
	return (
		<div className="flex items-center gap-3 py-2">
			<span className="h-px flex-1 bg-border" />
			<span className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
				{formatDayLabel(timestamp)}
			</span>
			<span className="h-px flex-1 bg-border" />
		</div>
	);
}
