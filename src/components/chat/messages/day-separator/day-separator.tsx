import { Badge } from "#/components/ui/badge";
import { formatDayLabel } from "#/lib/format/time";

export function DaySeparator({ timestamp }: { timestamp: number }) {
	return (
		<div className="sticky top-2 z-10 flex justify-center py-2">
			<Badge variant="secondary" className="shadow-sm">
				{formatDayLabel(timestamp)}
			</Badge>
		</div>
	);
}
