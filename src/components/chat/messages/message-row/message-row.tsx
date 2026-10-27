import { MessageStatus } from "#/components/chat/messages/message-status/message-status";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { Bubble, BubbleContent } from "#/components/ui/bubble";
import {
	Message,
	MessageAvatar,
	MessageContent,
	MessageFooter,
	MessageHeader,
} from "#/components/ui/message";
import { formatMessageTime } from "#/lib/format/time";
import type { ChatMessage } from "#/types/chat";

export function MessageRow({
	message,
	senderName,
	showHeader,
	showAvatar,
	onRetry,
}: {
	message: ChatMessage;
	senderName: string;
	showHeader: boolean;
	showAvatar: boolean;
	onRetry?: () => void;
}) {
	const outgoing = message.direction === "outgoing";
	const align = outgoing ? "end" : "start";

	return (
		<Message align={align}>
			{!outgoing &&
				(showAvatar ? (
					<MessageAvatar>
						<UserAvatar
							jid={message.from}
							name={senderName}
							size="sm"
							className="border-0"
						/>
					</MessageAvatar>
				) : (
					<div className="min-w-8 shrink-0" aria-hidden="true" />
				))}
			<MessageContent>
				{showHeader && !outgoing && <MessageHeader>{senderName}</MessageHeader>}
				<Bubble align={align} variant={outgoing ? "default" : "muted"}>
					<BubbleContent className="whitespace-pre-wrap">
						{message.body}
					</BubbleContent>
				</Bubble>
				<MessageFooter className="gap-1.5 px-1">
					<span>{formatMessageTime(message.timestamp)}</span>
					{outgoing && (
						<MessageStatus status={message.status} onRetry={onRetry} />
					)}
				</MessageFooter>
			</MessageContent>
		</Message>
	);
}
