import { RiLockLine } from "@remixicon/react";
import { cn } from "#/lib/utils";

/** Replaces a locked or undecryptable body with a safe explanation. */
export function MessageDecryptionError({
	reason,
	outgoing,
}: {
	reason: string;
	outgoing: boolean;
}) {
	return (
		<div
			className={cn(
				"flex items-start gap-1.5 text-xs leading-relaxed",
				outgoing ? "text-primary-foreground/80" : "text-muted-foreground",
			)}
		>
			<RiLockLine className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
			<span>{reason}</span>
		</div>
	);
}
