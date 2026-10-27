import { createFileRoute } from "@tanstack/react-router";
import { ConversationView } from "#/components/chat/conversation/conversation-view/conversation-view";

export const Route = createFileRoute("/chat/$jid")({
	component: ChatConversation,
});

function ChatConversation() {
	const { jid } = Route.useParams();
	return <ConversationView jid={jid} />;
}
