import { createFileRoute } from "@tanstack/react-router";
import { ConversationView } from "#/components/chat/conversation/conversation-view/conversation-view";

export const Route = createFileRoute("/chat/group/$room")({
	component: ChatGroupConversation,
});

function ChatGroupConversation() {
	const { room } = Route.useParams();
	return <ConversationView jid={room} kind="group" />;
}
