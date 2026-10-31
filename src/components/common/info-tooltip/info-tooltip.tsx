import { RiInformationLine } from "@remixicon/react";
import type { ReactNode } from "react";
import { Button } from "#/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";

/**
 * Small info affordance for details that should not take permanent space in a
 * dense settings panel. The trigger is a real button so keyboard and screen
 * readers can reveal the same text.
 */
export function InfoTooltip({
	label,
	children,
	className,
	side = "top",
}: {
	label: string;
	children: ReactNode;
	className?: string;
	side?: "top" | "bottom" | "left" | "right";
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={label}
						className={cn(
							"-my-1 size-5 shrink-0 rounded-full text-muted-foreground",
							className,
						)}
					/>
				}
			>
				<RiInformationLine className="size-3.5" />
			</TooltipTrigger>
			<TooltipContent side={side} className="max-w-xs leading-relaxed">
				{children}
			</TooltipContent>
		</Tooltip>
	);
}
