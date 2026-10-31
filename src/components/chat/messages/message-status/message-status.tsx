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
	tone = "default",
}: {
	status: MessageStatusValue;
	onRetry?: () => void;
	tone?: "default" | "inverse";
}) {
	if (status === "failed") {
		if (!onRetry) {
			return (
				<span
					className={cn(
						"inline-flex items-center gap-1",
						tone === "inverse" ? "text-primary-foreground" : "text-destructive",
					)}
					title={LABELS.failed}
				>
					<RiErrorWarningLine className="size-3.5" />
					<span>Failed</span>
				</span>
			);
		}
		return (
			<button
				type="button"
				onClick={onRetry}
				className={cn(
					"inline-flex items-center gap-1 hover:underline",
					tone === "inverse" ? "text-primary-foreground" : "text-destructive",
				)}
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
				"inline-flex items-center",
				tone === "inverse"
					? "text-primary-foreground/80"
					: "text-muted-foreground",
				status === "read" &&
					(tone === "inverse" ? "text-primary-foreground" : "text-primary"),
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
