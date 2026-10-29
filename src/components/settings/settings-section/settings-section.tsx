import type { ReactNode } from "react";

export function SettingsSection({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-5">
			<header className="space-y-1">
				<h2 className="text-base font-medium tracking-tight">{title}</h2>
				{description && (
					<p className="text-xs leading-relaxed text-muted-foreground">
						{description}
					</p>
				)}
			</header>
			<div className="flex flex-col gap-4">{children}</div>
		</section>
	);
}
