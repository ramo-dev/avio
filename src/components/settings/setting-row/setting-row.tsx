import type { ReactNode } from "react";

export function SettingRow({
	title,
	description,
	control,
}: {
	title: string;
	description?: string;
	control: ReactNode;
}) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="min-w-0 space-y-1">
				<p className="text-sm font-medium">{title}</p>
				{description && (
					<p className="text-xs leading-relaxed text-muted-foreground">
						{description}
					</p>
				)}
			</div>
			<div className="shrink-0 pt-0.5">{control}</div>
		</div>
	);
}
