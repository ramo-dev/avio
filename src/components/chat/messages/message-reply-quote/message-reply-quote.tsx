import { cn } from "#/lib/utils";
import type { ChatMessage, MessageReply } from "#/types/chat";

export function MessageReplyQuote({
	reply,
	original,
	senderName,
	outgoing,
}: {
	reply: MessageReply;
	original?: ChatMessage;
	senderName: string;
	outgoing: boolean;
}) {
	const author = original
		? original.direction === "outgoing"
			? "You"
			: senderName
		: "Original message";
	const preview = original
		? original.body ||
			original.attachments?.[0]?.name ||
			"Attachment unavailable"
		: "Original message unavailable";

	return (
		<div
			className={cn(
				"mb-1.5 min-w-0 rounded-md px-2 py-1 text-xs",
				outgoing ? "bg-primary-foreground/10" : "bg-background/50",
			)}
			title={reply.id}
		>
			<div className="font-medium">{author}</div>
			<div className="line-clamp-2 opacity-80">{preview}</div>
		</div>
	);
}
