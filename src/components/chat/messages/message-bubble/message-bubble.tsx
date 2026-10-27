import { cva } from "class-variance-authority";
import type { ReactNode } from "react";
import { Bubble, BubbleContent } from "#/components/ui/bubble";
import { cn } from "#/lib/utils";
import type { MessageDirection, MessagePosition } from "#/types/chat";

const messageBubbleVariants = cva("whitespace-pre-wrap rounded-2xl!", {
	variants: {
		direction: {
			incoming: "",
			outgoing: "",
		},
		position: {
			single: "",
			first: "",
			middle: "",
			last: "",
		},
	},
	compoundVariants: [
		{ direction: "incoming", position: "single", class: "rounded-bl-none!" },
		{ direction: "incoming", position: "first", class: "rounded-bl-md!" },
		{ direction: "incoming", position: "middle", class: "rounded-l-md!" },
		{
			direction: "incoming",
			position: "last",
			class: "rounded-tl-md! rounded-bl-none!",
		},
		{ direction: "outgoing", position: "single", class: "rounded-br-none!" },
		{ direction: "outgoing", position: "first", class: "rounded-br-md!" },
		{ direction: "outgoing", position: "middle", class: "rounded-r-md!" },
		{
			direction: "outgoing",
			position: "last",
			class: "rounded-tr-md! rounded-br-none!",
		},
	],
	defaultVariants: {
		direction: "incoming",
		position: "single",
	},
});

export function MessageBubble({
	direction,
	position,
	active,
	footer,
	actions,
	children,
}: {
	direction: MessageDirection;
	position: MessagePosition;
	active?: boolean;
	footer?: ReactNode;
	actions?: ReactNode;
	children: ReactNode;
}) {
	const align = direction === "outgoing" ? "end" : "start";
	return (
		<Bubble
			align={align}
			variant={direction === "outgoing" ? "default" : "muted"}
		>
			{actions && (
				<div
					className={cn(
						"absolute bottom-full z-10 pb-1 pointer-events-none opacity-0 transition-opacity group-focus-within/message:pointer-events-auto group-focus-within/message:opacity-100 group-hover/message:pointer-events-auto group-hover/message:opacity-100",
						direction === "outgoing" ? "right-0" : "left-0",
					)}
				>
					{actions}
				</div>
			)}
			<BubbleContent
				className={cn(
					messageBubbleVariants({ direction, position }),
					active && "ring-2 ring-ring/70 ring-offset-2 ring-offset-background",
				)}
			>
				<div>{children}</div>
				{footer && (
					<div className="mt-1 flex items-center justify-end gap-1 text-[11px] leading-none opacity-70">
						{footer}
					</div>
				)}
			</BubbleContent>
		</Bubble>
	);
}
