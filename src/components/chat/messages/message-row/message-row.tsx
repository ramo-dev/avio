import { cn } from "cn";
import { MessageBubble } from "#/components/chat/messages/message-bubble/message-bubble";
import { MessageStatus } from "#/components/chat/messages/message-status/message-status";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import {
	Message,
	MessageAvatar,
	MessageContent,
	MessageHeader,
} from "#/components/ui/message";
import { highlightText } from "#/lib/format/highlight";
import { formatMessageTime } from "#/lib/format/time";
import type { ChatMessage, MessagePosition } from "#/types/chat";

export function MessageRow({
	message,
	senderName,
	showHeader,
	showAvatar,
	showMeta,
	position,
	active,
	highlightQuery,
	onRetry,
}: {
	message: ChatMessage;
	senderName: string;
	showHeader: boolean;
	showAvatar: boolean;
	showMeta: boolean;
	position: MessagePosition;
	active?: boolean;
	highlightQuery?: string;
	onRetry?: () => void;
}) {
	const outgoing = message.direction === "outgoing";
	const align = outgoing ? "end" : "start";
	const body = highlightQuery
		? highlightText(
				message.body,
				highlightQuery,
				outgoing
					? "bg-primary-foreground/25 text-inherit"
					: "bg-primary/20 text-inherit",
			)
		: message.body;

	return (
		<Message
			align={align}
			role="article"
			aria-label={`${senderName}, ${formatMessageTime(message.timestamp)}, ${outgoing ? message.status : "received"}`}
		>
			{!outgoing &&
				(showAvatar ? (
					<MessageAvatar>
						<UserAvatar
							jid={message.from}
							name={senderName}
							className="border-0"
						/>
					</MessageAvatar>
				) : (
					<div className="min-w-8 shrink-0" aria-hidden="true" />
				))}
			<MessageContent>
				{showHeader && !outgoing && <MessageHeader>{senderName}</MessageHeader>}
				<MessageBubble
					direction={message.direction}
					position={position}
					active={active}
					footer={
						showMeta ? (
							<>
								<span className={cn(outgoing ? "ml-auto" : "mr-auto")}>
									{formatMessageTime(message.timestamp)}
								</span>
								{outgoing && (
									<MessageStatus
										status={message.status}
										onRetry={onRetry}
										tone="inverse"
									/>
								)}
							</>
						) : undefined
					}
				>
					{body}
				</MessageBubble>
			</MessageContent>
		</Message>
	);
}
