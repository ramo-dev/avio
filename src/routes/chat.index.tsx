import { createFileRoute } from "@tanstack/react-router";
import { EmptyConversation } from "#/components/chat/empty-conversation/empty-conversation";
import { validateSidePanelSearch } from "#/lib/side-panel-selection";

export const Route = createFileRoute("/chat/")({
	component: EmptyConversation,
	validateSearch: validateSidePanelSearch,
});
