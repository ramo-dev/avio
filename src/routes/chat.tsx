import { createFileRoute } from "@tanstack/react-router";
import { ChatLayout } from "#/components/chat/chat-layout/chat-layout";
import { validateSidePanelSearch } from "#/lib/side-panel-selection";

export const Route = createFileRoute("/chat")({
	component: ChatLayout,
	validateSearch: validateSidePanelSearch,
});
