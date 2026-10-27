import { createFileRoute } from "@tanstack/react-router";
import { EmptyConversation } from "#/components/chat/empty-conversation/empty-conversation";

export const Route = createFileRoute("/chat/")({
	component: EmptyConversation,
});
