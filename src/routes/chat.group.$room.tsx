import { createFileRoute } from "@tanstack/react-router";
import { ConversationView } from "#/components/chat/conversation/conversation-view/conversation-view";
import { validateSidePanelSearch } from "#/lib/side-panel-selection";

export const Route = createFileRoute("/chat/group/$room")({
	component: ChatGroupConversation,
	validateSearch: validateSidePanelSearch,
});

function ChatGroupConversation() {
	const { room } = Route.useParams();
	return <ConversationView jid={room} kind="group" />;
}
