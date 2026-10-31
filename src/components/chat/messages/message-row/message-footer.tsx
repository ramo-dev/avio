import { RiLockLine, RiLockUnlockLine } from "@remixicon/react";
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
	const trusted = outgoing || message.trusted === true;

	return (
		<>
			<span className={cn(outgoing ? "ml-auto" : "mr-auto")}>
				{formatMessageTime(message.timestamp)}
			</span>
			{message.edited && <span>edited</span>}
			{message.unencryptedFallback && (
				<span
					className="inline-flex items-center gap-0.5"
					title="Sent without end-to-end encryption"
				>
					<RiLockUnlockLine className="size-3" aria-hidden="true" />
					<span>Unencrypted</span>
				</span>
			)}
			{message.encrypted && (
				<span
					className="inline-flex items-center gap-0.5"
					title={
						trusted
							? "End-to-end encrypted with a trusted device"
							: "End-to-end encrypted with an unverified device"
					}
				>
					<RiLockLine className="size-3" aria-hidden="true" />
					<span>{trusted ? "Encrypted" : "Unverified"}</span>
				</span>
			)}
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
