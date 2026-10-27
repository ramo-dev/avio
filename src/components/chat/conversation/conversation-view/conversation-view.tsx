import { Composer } from "#/components/chat/composer/composer";
import { ConversationHeader } from "#/components/chat/conversation/header/conversation-header/conversation-header";
import { MessageList } from "#/components/chat/messages/message-list/message-list";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";
import { displayJidName } from "#/lib/xmpp/jid";
import { OFFLINE_PRESENCE } from "#/lib/xmpp/presence";

export function ConversationView({ jid }: { jid: string }) {
	const state = useXmppState();
	const actions = useXmppActions();
	const contact = state.contacts[jid];
	const conversation = state.conversations[jid];
	const name = displayJidName(jid, contact?.name);
	const presence = contact?.presence ?? OFFLINE_PRESENCE;
	const connected = state.connection.status === "connected";

	return (
		<div className="flex h-full min-h-0 flex-col bg-background">
			<ConversationHeader
				jid={jid}
				name={name}
				presence={presence}
				typing={conversation?.typing ?? false}
			/>
			<div className="min-h-0 flex-1">
				<MessageList
					messages={conversation?.messages ?? []}
					contactName={name}
					onRetry={(messageId) => void actions.retryMessage(messageId)}
				/>
			</div>
			<Composer jid={jid} disabled={!connected} />
		</div>
	);
}
