import { createFileRoute } from "@tanstack/react-router";
import { ConversationView } from "#/components/chat/conversation/conversation-view/conversation-view";
import { validateSidePanelSearch } from "#/lib/side-panel-selection";

export const Route = createFileRoute("/chat/$jid")({
	component: ChatConversation,
	validateSearch: validateSidePanelSearch,
});

function ChatConversation() {
	const { jid } = Route.useParams();
	return <ConversationView key={jid} jid={jid} />;
}
