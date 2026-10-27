import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Composer } from "#/components/chat/composer/composer";
import { ConversationHeader } from "#/components/chat/conversation/header/conversation-header/conversation-header";
import { InThreadSearch } from "#/components/chat/conversation/search/in-thread-search/in-thread-search";
import { MessageList } from "#/components/chat/messages/message-list/message-list";
import { Spinner } from "#/components/ui/spinner";
import { useMediaQuery } from "#/hooks/use-media-query";
import { useSendFiles } from "#/hooks/use-send-files";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";
import { findMessageMatches } from "#/lib/chat/search";
import { displayJidName } from "#/lib/xmpp/jid";
import { OFFLINE_PRESENCE } from "#/lib/xmpp/presence";
import type { ChatMessage } from "#/types/chat";

const EMPTY_MESSAGES: ChatMessage[] = [];

export function ConversationView({ jid }: { jid: string }) {
	const state = useXmppState();
	const actions = useXmppActions();
	const navigate = useNavigate();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const sendFiles = useSendFiles(jid);
	const contact = state.contacts[jid];
	const conversation = state.conversations[jid];
	const messages = conversation?.messages ?? EMPTY_MESSAGES;
	const name = displayJidName(jid, contact?.name);
	const presence = contact?.presence ?? OFFLINE_PRESENCE;
	const connected = state.connection.status === "connected";

	const [searchOpen, setSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [matchIndex, setMatchIndex] = useState(0);
	const matches = useMemo(
		() => (searchOpen ? findMessageMatches(messages, searchQuery) : []),
		[messages, searchOpen, searchQuery],
	);
	const activeMatch = matches[matchIndex];

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

			<div className="min-h-0 flex-1">
				<MessageList
					jid={jid}
					messages={messages}
					contactName={name}
					typing={conversation?.typing ?? false}
					highlightQuery={searchOpen ? searchQuery : ""}
					activeMessageId={activeMatch?.messageId ?? null}
					activeGroupId={activeMatch?.groupId ?? null}
					onRetry={(messageId) => void actions.retryMessage(messageId)}
					onQuickReply={(body) => void actions.sendMessage(jid, body)}
				/>
			</div>

			<Composer jid={jid} disabled={!connected} onSendFiles={sendFiles} />
		</div>
	);
}
