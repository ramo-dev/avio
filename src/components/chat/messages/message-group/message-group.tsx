import { MessageRow } from "#/components/chat/messages/message-row/message-row";
import { MessageGroup as MessageGroupShell } from "#/components/ui/message";
import type { MessageGroup } from "#/types/chat";

export function MessageGroupView({
	group,
	senderName,
	onRetry,
}: {
	group: MessageGroup;
	senderName: string;
	onRetry?: (messageId: string) => void;
}) {
	return (
		<MessageGroupShell>
			{group.messages.map((message, index) => (
				<MessageRow
					key={message.id}
					message={message}
					senderName={senderName}
					showHeader={index === 0 && group.direction === "incoming"}
					showAvatar={
						group.direction === "incoming" &&
						index === group.messages.length - 1
					}
					onRetry={
						message.status === "failed"
							? () => onRetry?.(message.id)
							: undefined
					}
				/>
			))}
		</MessageGroupShell>
	);
}
