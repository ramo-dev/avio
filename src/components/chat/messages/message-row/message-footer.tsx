import { MessageEncryptionMarker } from "#/components/chat/messages/message-row/message-encryption-marker";
import { MessageStatus } from "#/components/chat/messages/message-status/message-status";
import { formatMessageTime } from "#/lib/format/time";
import { cn } from "#/lib/utils";
import type { ChatMessage } from "#/types/chat";

/** Timestamp, edit marker, encryption state, and delivery status. */
export function MessageFooter({
	message,
	onRetry,
}: {
	message: ChatMessage;
	onRetry?: () => void;
}) {
	const outgoing = message.direction === "outgoing";

	return (
		<>
			<span className={cn(outgoing ? "ml-auto" : "mr-auto")}>
				{formatMessageTime(message.timestamp)}
			</span>
			{message.edited && <span>edited</span>}
			<MessageEncryptionMarker message={message} />
			{outgoing && (
				<MessageStatus
					status={message.status}
					onRetry={onRetry}
					tone="inverse"
				/>
			)}
		</>
	);
}
