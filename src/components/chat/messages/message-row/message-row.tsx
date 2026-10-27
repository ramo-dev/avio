import { cn } from "cn";
import { MessageAttachments } from "#/components/chat/messages/message-attachments/message-attachments";
import { MessageBubble } from "#/components/chat/messages/message-bubble/message-bubble";
import { MessageReactions } from "#/components/chat/messages/message-reactions/message-reactions";
import { MessageReplyQuote } from "#/components/chat/messages/message-reply-quote/message-reply-quote";
import { MessageStatus } from "#/components/chat/messages/message-status/message-status";
import { MessageToolbar } from "#/components/chat/messages/message-toolbar/message-toolbar";
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
	replyToMessage,
	currentUserJid,
	onReply,
	onEdit,
	onReact,
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
	replyToMessage?: ChatMessage;
	currentUserJid?: string;
	onReply?: (message: ChatMessage) => void;
	onEdit?: (message: ChatMessage) => void;
	onReact?: (message: ChatMessage, emoji: string) => void;
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
	const showBody =
		message.body.length > 0 &&
		!message.attachments?.some(
			(attachment) =>
				attachment.name === message.body || attachment.url === message.body,
		);
	const toolbar =
		onReply || onReact ? (
			<MessageToolbar
				onReply={() => onReply?.(message)}
				onEdit={outgoing && onEdit ? () => onEdit(message) : undefined}
				onReact={(emoji) => onReact?.(message, emoji)}
			/>
		) : undefined;

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
					actions={toolbar}
					footer={
						showMeta ? (
							<>
								<span className={cn(outgoing ? "ml-auto" : "mr-auto")}>
									{formatMessageTime(message.timestamp)}
								</span>
								{message.edited && <span>edited</span>}
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
					{message.replyTo && (
						<MessageReplyQuote
							reply={message.replyTo}
							original={replyToMessage}
							senderName={senderName}
							outgoing={outgoing}
						/>
					)}
					{showBody && <div>{body}</div>}
					{message.attachments && message.attachments.length > 0 && (
						<MessageAttachments
							attachments={message.attachments}
							outgoing={outgoing}
						/>
					)}
				</MessageBubble>
				{message.reactions && (
					<MessageReactions
						reactions={message.reactions}
						currentUserJid={currentUserJid}
						outgoing={outgoing}
						onToggle={(emoji) => onReact?.(message, emoji)}
					/>
				)}
			</MessageContent>
		</Message>
	);
}
