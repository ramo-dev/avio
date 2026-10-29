import { RiShareForwardLine } from "@remixicon/react";
import { cn } from "cn";
import {
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { toast } from "react-hot-toast";
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
import { copyText } from "#/lib/chat/clipboard";
import { highlightText } from "#/lib/format/highlight";
import { formatMessageTime } from "#/lib/format/time";
import { shouldShowMessageBody } from "#/lib/xmpp/messages";
import { selectUserReactions } from "#/lib/xmpp/reactions";
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
	onDelete,
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
	onDelete?: (message: ChatMessage) => void;
}) {
	const [actionsOpen, setActionsOpen] = useState(false);
	const [forwardOpen, setForwardOpen] = useState(false);
	const rowRef = useRef<HTMLDivElement>(null);
	const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pressOrigin = useRef<{ x: number; y: number } | null>(null);
	const swipeHandled = useRef(false);
	const outgoing = message.direction === "outgoing";
	const body = highlightQuery
		? highlightText(
				message.body,
				highlightQuery,
				outgoing
					? "bg-primary-foreground/25 text-inherit"
					: "bg-primary/20 text-inherit",
			)
		: message.body;
	const myReaction = selectUserReactions(message.reactions, currentUserJid)[0];
	const copyValue = message.body || message.attachments?.[0]?.url || "";
	const toolbar =
		onReply || onReact ? (
			<MessageToolbar
				onReply={() => {
					setActionsOpen(false);
					onReply?.(message);
				}}
				onEdit={
					outgoing && onEdit
						? () => {
								setActionsOpen(false);
								onEdit(message);
							}
						: undefined
				}
				myReaction={myReaction}
				onReact={(emoji) => {
					setActionsOpen(false);
					onReact?.(message, emoji);
				}}
				onCopy={
					copyValue
						? () => {
								setActionsOpen(false);
								void copyMessage();
							}
						: undefined
				}
				onDelete={
					onDelete
						? () => {
								setActionsOpen(false);
								onDelete(message);
							}
						: undefined
				}
				forwardSource={message}
				onForwarded={() => setActionsOpen(false)}
				forwardOpen={forwardOpen}
				onForwardOpenChange={setForwardOpen}
			/>
		) : undefined;

	async function copyMessage() {
		try {
			await copyText(copyValue);
			toast.success("Message copied");
		} catch {
			toast.error("Could not copy message");
		}
	}

	const clearLongPressTimer = useCallback(() => {
		if (longPressTimer.current) {
			clearTimeout(longPressTimer.current);
			longPressTimer.current = null;
		}
	}, []);

	function resetPress() {
		clearLongPressTimer();
		pressOrigin.current = null;
	}

	function startLongPress(event: ReactPointerEvent<HTMLDivElement>) {
		if (event.pointerType === "mouse") return;
		const target = event.target as HTMLElement;
		if (target.closest("a, button, input, textarea, [role=button]")) return;
		resetPress();
		swipeHandled.current = false;
		pressOrigin.current = { x: event.clientX, y: event.clientY };
		longPressTimer.current = setTimeout(() => {
			longPressTimer.current = null;
			setActionsOpen(true);
		}, 500);
	}

	function trackLongPress(event: ReactPointerEvent<HTMLDivElement>) {
		const origin = pressOrigin.current;
		if (!origin) return;
		const dx = event.clientX - origin.x;
		const dy = event.clientY - origin.y;

		if (Math.abs(dx) > 10 || Math.abs(dy) > 10) clearLongPressTimer();
		if (swipeHandled.current) return;
		if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
			resetPress();
			return;
		}

		const swipeDistance = outgoing ? -dx : dx;
		if (swipeDistance >= 56 && Math.abs(dx) > Math.abs(dy)) {
			swipeHandled.current = true;
			resetPress();
			setActionsOpen(false);
			setForwardOpen(true);
		}
	}

	function openContextMenu(event: ReactMouseEvent<HTMLDivElement>) {
		const target = event.target as HTMLElement;
		if (target.closest("a, button, input, textarea, [role=button]")) return;
		event.preventDefault();
		resetPress();
		setActionsOpen(true);
	}

	useEffect(() => {
		function closeOnOutsidePress(event: PointerEvent) {
			if (!rowRef.current?.contains(event.target as Node)) {
				setActionsOpen(false);
			}
		}
		document.addEventListener("pointerdown", closeOnOutsidePress);
		return () =>
			document.removeEventListener("pointerdown", closeOnOutsidePress);
	}, []);

	useEffect(
		() => () => {
			clearLongPressTimer();
		},
		[clearLongPressTimer],
	);

	return (
		<Message
			ref={rowRef}
			align={outgoing ? "end" : "start"}
			role="article"
			className="touch-pan-y"
			onContextMenu={openContextMenu}
			onPointerDown={startLongPress}
			onPointerMove={trackLongPress}
			onPointerUp={resetPress}
			onPointerCancel={resetPress}
			onPointerLeave={resetPress}
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
					actionsOpen={actionsOpen}
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
					{message.forwarded && (
						<div className="mb-1 flex items-center gap-1 text-[11px] font-medium opacity-70">
							<RiShareForwardLine className="size-3" />
							Forwarded
						</div>
					)}
					{message.replyTo && (
						<MessageReplyQuote
							reply={message.replyTo}
							original={replyToMessage}
							senderName={senderName}
							outgoing={outgoing}
						/>
					)}
					{shouldShowMessageBody(message) && <div>{body}</div>}
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
						onToggle={(emoji) => {
							setActionsOpen(false);
							onReact?.(message, emoji);
						}}
					/>
				)}
			</MessageContent>
		</Message>
	);
}
