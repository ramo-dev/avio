import { createFileRoute } from "@tanstack/react-router";
import { ChatLayout } from "#/components/chat/chat-layout/chat-layout";
import { ChatProviders } from "#/components/chat/chat-providers/chat-providers";
import { validateSidePanelSearch } from "#/lib/side-panel-selection";

function ChatRoute() {
	return (
		<ChatProviders>
			<ChatLayout />
		</ChatProviders>
	);
}

export const Route = createFileRoute("/chat")({
	component: ChatRoute,
	validateSearch: validateSidePanelSearch,
});
