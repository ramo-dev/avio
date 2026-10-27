import { RiChat3Line } from "@remixicon/react";
import { useEffect, useMemo } from "react";
import { DaySeparator } from "#/components/chat/messages/day-separator/day-separator";
import { MessageGroupView } from "#/components/chat/messages/message-group/message-group";
import { TypingIndicator } from "#/components/chat/messages/typing-indicator/typing-indicator";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { Button } from "#/components/ui/button";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
	useMessageScroller,
} from "#/components/ui/message-scroller";
import { buildTimeline } from "#/lib/format/timeline";
import type { ChatMessage } from "#/types/chat";

const QUICK_REPLIES = ["Hi!", "How are you?", "👋"];

export function MessageList({
	jid,
	messages,
	contactName,
	typing,
	highlightQuery,
	activeMessageId,
	activeGroupId,
	onRetry,
	onQuickReply,
}: {
	jid: string;
	messages: ChatMessage[];
	contactName: string;
	typing: boolean;
	highlightQuery?: string;
	activeMessageId?: string | null;
	activeGroupId?: string | null;
	onRetry?: (messageId: string) => void;
	onQuickReply?: (body: string) => void;
}) {
	const timeline = useMemo(() => buildTimeline(messages), [messages]);
	const searchActive = Boolean(highlightQuery?.trim());

	if (messages.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
				<UserAvatar
					jid={jid}
					name={contactName}
					size="lg"
					className="size-16"
				/>
				<div className="space-y-1">
					<h3 className="text-base font-semibold">{contactName}</h3>
					<p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
						<RiChat3Line className="size-4" />
						Say hello 👋
					</p>
				</div>
				{onQuickReply && (
					<div className="flex flex-wrap items-center justify-center gap-2">
						{QUICK_REPLIES.map((reply) => (
							<Button
								key={reply}
								variant="outline"
								size="sm"
								onClick={() => onQuickReply(reply)}
							>
								{reply}
							</Button>
						))}
					</div>
				)}
				{typing && <TypingIndicator name={contactName} />}
			</div>
		);
	}

	return (
		<MessageScrollerProvider
			autoScroll={!searchActive}
			defaultScrollPosition="end"
		>
			<MessageScroller className="bg-muted/20">
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
										activeMessageId={activeMessageId}
										highlightQuery={highlightQuery}
										onRetry={onRetry}
									/>
								</MessageScrollerItem>
							),
						)}
						{typing && (
							<MessageScrollerItem messageId="typing-indicator">
								<TypingIndicator name={contactName} />
							</MessageScrollerItem>
						)}
					</MessageScrollerContent>
				</MessageScrollerViewport>
				<MessageScrollerButton />
				<ScrollToGroup groupId={activeGroupId ?? null} />
			</MessageScroller>
		</MessageScrollerProvider>
	);
}

function ScrollToGroup({ groupId }: { groupId: string | null }) {
	const { scrollToMessage } = useMessageScroller();

	useEffect(() => {
		if (!groupId) return;
		scrollToMessage(groupId, { behavior: "smooth", align: "center" });
	}, [groupId, scrollToMessage]);

	return null;
}
