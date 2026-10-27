import { createFileRoute } from "@tanstack/react-router";
import { ChatLayout } from "#/components/chat/chat-layout/chat-layout";

export const Route = createFileRoute("/chat")({ component: ChatLayout });
