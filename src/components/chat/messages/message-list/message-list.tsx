import { RiChat3Line, RiGroupLine } from "@remixicon/react";
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
	currentUserJid,
	resolveSenderName,
	onRetry,
	onQuickReply,
	onReply,
	onEdit,
	onReact,
	onDelete,
}: {
	jid: string;
	messages: ChatMessage[];
	contactName: string;
	typing: boolean;
	highlightQuery?: string;
	activeMessageId?: string | null;
	activeGroupId?: string | null;
	currentUserJid?: string;
	resolveSenderName?: (senderJid: string) => string;
	onRetry?: (messageId: string) => void;
	onQuickReply?: (body: string) => void;
	onReply?: (message: ChatMessage) => void;
	onEdit?: (message: ChatMessage) => void;
	onReact?: (message: ChatMessage, emoji: string) => void;
	onDelete?: (message: ChatMessage) => void;
}) {
	const timeline = useMemo(() => buildTimeline(messages), [messages]);
	const messagesById = useMemo(
		() => new Map(messages.map((message) => [message.id, message])),
		[messages],
	);
	const searchActive = Boolean(highlightQuery?.trim());
	const isGroup = Boolean(resolveSenderName);

	if (messages.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
				{isGroup ? (
					<span className="grid size-16 place-items-center rounded-full bg-muted text-muted-foreground">
						<RiGroupLine className="size-16" />
					</span>
				) : (
					<UserAvatar
						jid={jid}
						name={contactName}
						size="lg"
						className="size-16"
					/>
				)}
				<div className="space-y-1">
					<h3 className="text-base font-semibold">{contactName}</h3>
					<p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
						{isGroup ? (
							<RiGroupLine className="size-4" />
						) : (
							<RiChat3Line className="size-4" />
						)}
						{isGroup ? "No messages yet" : "Say hello 👋"}
					</p>
				</div>
				{!isGroup && onQuickReply && (
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
			<MessageScroller className="bg-muted/20 dark:bg-background">
				<MessageScrollerViewport
					id="messages"
					aria-label="Messages"
					className="scrollbar-subtle px-4 bg-background"
				>
					<MessageScrollerContent className="mx-auto bg-background w-full max-w-3xl justify-end pt-12 pb-6">
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
									style={{ contentVisibility: "visible" }}
								>
									<MessageGroupView
										group={item.group}
										senderName={
											resolveSenderName?.(item.group.senderJid) ?? contactName
										}
										showSenderHeader={isGroup}
										activeMessageId={activeMessageId}
										highlightQuery={highlightQuery}
										messagesById={messagesById}
										currentUserJid={currentUserJid}
										onReply={onReply}
										onEdit={onEdit}
										onReact={onReact}
										onDelete={onDelete}
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
