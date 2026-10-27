import { RiChat3Line } from "@remixicon/react";
import { useMemo } from "react";
import { DaySeparator } from "#/components/chat/messages/day-separator/day-separator";
import { MessageGroupView } from "#/components/chat/messages/message-group/message-group";
import { CenteredEmptyState } from "#/components/common/centered-empty/centered-empty";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "#/components/ui/message-scroller";
import { buildTimeline } from "#/lib/format/timeline";
import type { ChatMessage } from "#/types/chat";

export function MessageList({
	messages,
	contactName,
	onRetry,
}: {
	messages: ChatMessage[];
	contactName: string;
	onRetry?: (messageId: string) => void;
}) {
	const timeline = useMemo(() => buildTimeline(messages), [messages]);

	if (messages.length === 0) {
		return (
			<div className="flex h-full items-center justify-center p-6">
				<CenteredEmptyState
					icon={<RiChat3Line />}
					title="No messages yet"
					description="Send the first message to start the conversation."
				/>
			</div>
		);
	}

	return (
		<MessageScrollerProvider autoScroll defaultScrollPosition="end">
			<MessageScroller>
				<MessageScrollerViewport
					id="messages"
					aria-label="Messages"
					className="scrollbar-subtle px-4"
				>
					<MessageScrollerContent className="mx-auto w-full max-w-3xl justify-end py-6">
						{timeline.map((item) =>
							item.kind === "day" ? (
								<MessageScrollerItem key={item.id} messageId={item.id}>
									<DaySeparator timestamp={item.timestamp} />
								</MessageScrollerItem>
							) : (
								<MessageScrollerItem
									key={item.id}
									messageId={item.group.id}
									scrollAnchor={item.group.direction === "outgoing"}
								>
									<MessageGroupView
										group={item.group}
										senderName={contactName}
										onRetry={onRetry}
									/>
								</MessageScrollerItem>
							),
						)}
					</MessageScrollerContent>
				</MessageScrollerViewport>
				<MessageScrollerButton />
			</MessageScroller>
		</MessageScrollerProvider>
	);
}
