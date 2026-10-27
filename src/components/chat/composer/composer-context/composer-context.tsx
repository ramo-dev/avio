import { RiCloseLine, RiEditLine, RiReplyLine } from "@remixicon/react";
import { Button } from "#/components/ui/button";
import type { ChatMessage } from "#/types/chat";

export function ComposerContext({
	replyTo,
	editing,
	contactName,
	onCancel,
}: {
	replyTo?: ChatMessage | null;
	editing?: ChatMessage | null;
	contactName: string;
	onCancel: () => void;
}) {
	const message = editing ?? replyTo;
	if (!message) return null;
	const preview =
		message.body || message.attachments?.[0]?.name || "Attachment unavailable";
	const label = editing
		? "Editing message"
		: message.direction === "outgoing"
			? "Replying to your message"
			: `Replying to ${contactName}`;

	return (
		<div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs">
			{editing ? (
				<RiEditLine className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
			) : (
				<RiReplyLine className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
			)}
			<div className="min-w-0 flex-1">
				<div className="font-medium">{label}</div>
				<div className="line-clamp-1 text-muted-foreground">{preview}</div>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				aria-label="Cancel"
				className="size-6 shrink-0 rounded-full text-muted-foreground"
				onClick={onCancel}
			>
				<RiCloseLine className="size-3.5" />
			</Button>
		</div>
	);
}
