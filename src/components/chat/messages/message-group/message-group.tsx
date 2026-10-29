import { MessageRow } from "#/components/chat/messages/message-row/message-row";
import { MessageGroup as MessageGroupShell } from "#/components/ui/message";
import type { ChatMessage, MessageGroup } from "#/types/chat";

export function MessageGroupView({
	group,
	senderName,
	activeMessageId,
	highlightQuery,
	messagesById,
	currentUserJid,
	onRetry,
	onReply,
	onEdit,
	onReact,
	onDelete,
}: {
	group: MessageGroup;
	senderName: string;
	activeMessageId?: string | null;
	highlightQuery?: string;
	messagesById?: Map<string, ChatMessage>;
	currentUserJid?: string;
	onRetry?: (messageId: string) => void;
	onReply?: (message: ChatMessage) => void;
	onEdit?: (message: ChatMessage) => void;
	onReact?: (message: ChatMessage, emoji: string) => void;
	onDelete?: (message: ChatMessage) => void;
}) {
	return (
		<MessageGroupShell className="gap-0.5">
			{group.messages.map((message, index) => {
				const position =
					group.messages.length === 1
						? "single"
						: index === 0
							? "first"
							: index === group.messages.length - 1
								? "last"
								: "middle";

				return (
					<MessageRow
						key={message.id}
						message={message}
						senderName={senderName}
						showHeader={false}
						//showHeader={index === 0 && group.direction === "incoming"}
						showAvatar={
							group.direction === "incoming" &&
							index === group.messages.length - 1
						}
						showMeta={index === group.messages.length - 1}
						position={position}
						active={message.id === activeMessageId}
						highlightQuery={highlightQuery}
						replyToMessage={
							message.replyTo
								? messagesById?.get(message.replyTo.id)
								: undefined
						}
						currentUserJid={currentUserJid}
						onReply={onReply}
						onEdit={onEdit}
						onReact={onReact}
						onDelete={onDelete}
						onRetry={
							message.status === "failed"
								? () => onRetry?.(message.id)
								: undefined
						}
					/>
				);
			})}
		</MessageGroupShell>
	);
}
