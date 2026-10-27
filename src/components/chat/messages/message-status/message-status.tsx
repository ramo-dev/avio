import {
	RiCheckDoubleLine,
	RiCheckLine,
	RiErrorWarningLine,
} from "@remixicon/react";
import { Spinner } from "#/components/ui/spinner";
import { cn } from "#/lib/utils";
import type { MessageStatus as MessageStatusValue } from "#/types/chat";

const LABELS: Record<MessageStatusValue, string> = {
	pending: "Sending",
	sent: "Sent",
	delivered: "Delivered",
	read: "Read",
	failed: "Failed to send",
};

export function MessageStatus({
	status,
	onRetry,
}: {
	status: MessageStatusValue;
	onRetry?: () => void;
}) {
	if (status === "failed") {
		return (
			<button
				type="button"
				onClick={onRetry}
				className="inline-flex items-center gap-1 text-destructive hover:underline"
				title={LABELS.failed}
			>
				<RiErrorWarningLine className="size-3.5" />
				<span>Retry</span>
			</button>
		);
	}

	return (
		<span
			className={cn(
				"inline-flex items-center text-muted-foreground",
				status === "read" && "text-primary",
			)}
			title={LABELS[status]}
		>
			{status === "pending" ? (
				<Spinner className="size-3" />
			) : status === "sent" ? (
				<RiCheckLine className="size-3.5" />
			) : (
				<RiCheckDoubleLine className="size-3.5" />
			)}
			<span className="sr-only">{LABELS[status]}</span>
		</span>
	);
}
