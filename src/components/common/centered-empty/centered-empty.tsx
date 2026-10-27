import type { ReactNode } from "react";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
import { cn } from "#/lib/utils";

export function CenteredEmptyState({
	icon,
	title,
	description,
	className,
}: {
	icon: ReactNode;
	title: string;
	description: string;
	className?: string;
}) {
	return (
		<Empty className={cn("border-0", className)}>
			<EmptyHeader>
				<EmptyMedia variant="icon">{icon}</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
