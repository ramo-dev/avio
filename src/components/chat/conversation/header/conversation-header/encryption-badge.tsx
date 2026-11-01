import { RiLockUnlockLine } from "@remixicon/react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";

/** Tooltip-only marker for conversations that are not end-to-end encrypted. */
export function EncryptionBadge({ scope }: { scope: "direct" | "group" }) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<span
						role="img"
						aria-label="Not end-to-end encrypted"
						className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive/80"
					/>
				}
			>
				<RiLockUnlockLine className="size-3" aria-hidden="true" />
			</TooltipTrigger>
			<TooltipContent>
				{scope === "group"
					? "Group messages are sent without end-to-end encryption."
					: "Messages in this chat are sent without end-to-end encryption. Turn it on from the composer."}
			</TooltipContent>
		</Tooltip>
	);
}
