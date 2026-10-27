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
	action,
	className,
}: {
	icon: ReactNode;
	title: string;
	description: string;
	action?: ReactNode;
	className?: string;
}) {
	return (
		<Empty className={cn("border-0", className)}>
			<EmptyHeader>
				<EmptyMedia variant="icon">{icon}</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
			{action}
		</Empty>
	);
}
