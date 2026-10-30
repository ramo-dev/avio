import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Composer } from "#/components/chat/composer/composer";
import { useRoomInvitePreview } from "#/components/chat/conversation/conversation-view/use-room-invite-preview";
import { ConversationHeader } from "#/components/chat/conversation/header/conversation-header/conversation-header";
import { InThreadSearch } from "#/components/chat/conversation/search/in-thread-search/in-thread-search";
import { MessageList } from "#/components/chat/messages/message-list/message-list";
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import { useMediaQuery } from "#/hooks/use-media-query";
import { useSendFiles } from "#/hooks/use-send-files";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";
import { findMessageMatches } from "#/lib/chat/search";
import { displayJidName, jidResource } from "#/lib/xmpp/jid";
import { OFFLINE_PRESENCE } from "#/lib/xmpp/presence";
import { selectRoomMembers } from "#/lib/xmpp/room-members";
import { useOmemo } from "#/providers/omemo-provider";
import type { ChatMessage, ConversationKind } from "#/types/chat";

const EMPTY_MESSAGES: ChatMessage[] = [];

export function ConversationView({
	jid,
	kind: routeKind,
}: {
	jid: string;
	kind?: ConversationKind;
}) {
	const state = useXmppState();
	const actions = useXmppActions();
	const omemo = useOmemo();
	const navigate = useNavigate();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const sendFiles = useSendFiles(jid);
	const contact = state.contacts[jid];
	const conversation = state.conversations[jid];
	const room = state.rooms[jid];
	const invite = state.roomInviteRequests.find(
		(request) => request.roomJid === jid,
	);
	const isInvitePreview = Boolean(invite) && !room;
	const kind = routeKind ?? conversation?.kind ?? (room ? "group" : "direct");
	const isGroup = kind === "group";
	const joined = !isGroup || Boolean(room && room.membership !== "joining");
	const hasJoinedRoom =
		isGroup && Boolean(room && room.membership !== "joining");
	const messages = conversation?.messages ?? EMPTY_MESSAGES;
	const name = isGroup
		? (invite?.roomName ??
			conversation?.title ??
			room?.name ??
			jid.split("@")[0] ??
			jid)
		: displayJidName(jid, contact?.name);
	const presence = contact?.presence ?? OFFLINE_PRESENCE;
	const connected = state.connection.status === "connected";

	const [searchOpen, setSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [matchIndex, setMatchIndex] = useState(0);
	const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
	const [editing, setEditing] = useState<ChatMessage | null>(null);
	const {
		status: previewStatus,
		accept: acceptInvite,
		decline: declineInvite,
	} = useRoomInvitePreview({
		jid,
		invite,
		isPreview: isInvitePreview,
		actions,
		navigate: (options) => void navigate(options),
	});
	const membersLoaded = useRef<string | null>(null);
	const currentUserJid = state.account?.bareJid;
	const matches = useMemo(
		() => (searchOpen ? findMessageMatches(messages, searchQuery) : []),
		[messages, searchOpen, searchQuery],
	);
	const activeMatch = matches[matchIndex];

	useEffect(() => {
		if (!hasJoinedRoom) return;
		if (membersLoaded.current === jid) return;
		membersLoaded.current = jid;
		void actions.refreshRoomMembers(jid).catch(() => undefined);
	}, [actions, hasJoinedRoom, jid]);

	function startReply(message: ChatMessage) {
		if (message.encrypted || omemo.isEncryptionEnabled(jid)) {
			toast.error("Replies to encrypted messages are not available yet.", {
				id: "omemo-context",
			});
			return;
		}
		setEditing(null);
		setReplyTo(message);
	}

	function startEdit(message: ChatMessage) {
		if (message.encrypted || omemo.isEncryptionEnabled(jid)) {
			toast.error("Edits to encrypted messages are not available yet.", {
				id: "omemo-context",
			});
			return;
		}
		setReplyTo(null);
		setEditing(message);
	}

	function reactToMessage(message: ChatMessage, emoji: string) {
		if (message.encrypted) {
			toast.error("Reactions to encrypted messages are not available yet.", {
				id: "omemo-context",
			});
			return;
		}
		void actions.toggleReaction(jid, message.id, emoji);
	}

	function clearComposerContext() {
		setReplyTo(null);
		setEditing(null);
	}

	function deleteMessage(message: ChatMessage) {
		if (replyTo?.id === message.id) setReplyTo(null);
		if (editing?.id === message.id) setEditing(null);
		actions.deleteMessage(jid, message.id);
	}

	useEffect(() => {
		if (matchIndex >= matches.length) {
			setMatchIndex(Math.max(0, matches.length - 1));
		}
	}, [matchIndex, matches.length]);

	useEffect(() => {
		function handleShortcut(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
				event.preventDefault();
				setSearchOpen(true);
			}
			if (event.key === "Escape" && searchOpen) {
				setSearchOpen(false);
				setSearchQuery("");
			}
		}
		window.addEventListener("keydown", handleShortcut);
		return () => window.removeEventListener("keydown", handleShortcut);
	}, [searchOpen]);

	function closeSearch() {
		setSearchOpen(false);
		setSearchQuery("");
		setMatchIndex(0);
	}

	function previousMatch() {
		if (matches.length === 0) return;
		setMatchIndex((index) => (index - 1 + matches.length) % matches.length);
	}

	function nextMatch() {
		if (matches.length === 0) return;
		setMatchIndex((index) => (index + 1) % matches.length);
	}

	return (
		<div className="flex h-full min-h-0 flex-col bg-background">
			<ConversationHeader
				jid={jid}
				name={name}
				presence={presence}
				kind={kind}
				memberCount={selectRoomMembers(room).length}
				typing={conversation?.typing ?? false}
				searchOpen={searchOpen}
				onToggleSearch={() => {
					if (searchOpen) closeSearch();
					else setSearchOpen(true);
				}}
				onBack={isDesktop ? undefined : () => navigate({ to: "/chat" })}
			/>

			{searchOpen && (
				<InThreadSearch
					query={searchQuery}
					onQueryChange={(value) => {
						setSearchQuery(value);
						setMatchIndex(0);
					}}
					count={matches.length}
					index={matchIndex}
					onPrevious={previousMatch}
					onNext={nextMatch}
					onClose={closeSearch}
				/>
			)}

			{state.connection.status === "reconnecting" && (
				<div className="flex shrink-0 items-center justify-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
					<Spinner className="size-3" />
					Reconnecting to XMPP…
				</div>
			)}

			{isInvitePreview && invite && (
				<div className="shrink-0 border-b border-border bg-muted/30 px-4 py-3">
					<p className="text-sm font-medium">{invite.roomName}</p>
					<p className="mt-0.5 text-xs text-muted-foreground">
						Invited by {invite.from}
						{invite.reason ? ` · ${invite.reason}` : ""}
					</p>
					<p className="mt-2 text-xs leading-relaxed text-muted-foreground">
						{previewStatus === "loading"
							? "Loading a read-only preview…"
							: previewStatus === "restricted"
								? "This private group hides its history until you join."
								: previewStatus === "ok" && messages.length > 0
									? "Read-only preview. Join to participate."
									: "Join this group to see its messages and send replies."}
					</p>
					<div className="mt-3 flex gap-2">
						<Button size="sm" onClick={() => void acceptInvite()}>
							Join group
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => void declineInvite()}
						>
							Decline
						</Button>
					</div>
				</div>
			)}

			<div className="min-h-0 flex-1">
				<MessageList
					jid={jid}
					messages={messages}
					contactName={name}
					typing={conversation?.typing ?? false}
					highlightQuery={searchOpen ? searchQuery : ""}
					activeMessageId={activeMatch?.messageId ?? null}
					activeGroupId={activeMatch?.groupId ?? null}
					currentUserJid={currentUserJid}
					resolveSenderName={
						isGroup
							? (senderJid) =>
									jidResource(senderJid) ?? displayJidName(senderJid)
							: undefined
					}
					onRetry={
						isInvitePreview
							? undefined
							: (messageId) => void actions.retryMessage(messageId)
					}
					onQuickReply={
						isInvitePreview
							? undefined
							: (body) =>
									omemo.isEncryptionEnabled(jid)
										? void omemo.sendMessage(jid, body)
										: void actions.sendMessage(jid, body)
					}
					onReply={isInvitePreview ? undefined : startReply}
					onEdit={isInvitePreview ? undefined : startEdit}
					onReact={isInvitePreview ? undefined : reactToMessage}
					onDelete={isInvitePreview ? undefined : deleteMessage}
				/>
			</div>

			<Composer
				jid={jid}
				disabled={!connected || isInvitePreview || !joined}
				contactName={name}
				onSendFiles={isInvitePreview ? undefined : sendFiles}
				replyTo={replyTo}
				editing={editing}
				onContextDone={clearComposerContext}
			/>
		</div>
	);
}
