import { MessageRow } from "#/components/chat/messages/message-row/message-row";
import { MessageGroup as MessageGroupShell } from "#/components/ui/message";
import type { MessageGroup } from "#/types/chat";

export function MessageGroupView({
	group,
	senderName,
	activeMessageId,
	highlightQuery,
	onRetry,
}: {
	group: MessageGroup;
	senderName: string;
	activeMessageId?: string | null;
	highlightQuery?: string;
	onRetry?: (messageId: string) => void;
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
