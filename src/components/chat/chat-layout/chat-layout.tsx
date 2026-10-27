import { Navigate, Outlet, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChatSidebar } from "#/components/chat/sidebar/chat-sidebar/chat-sidebar";
import { LoadingScreen } from "#/components/common/loading-screen/loading-screen";
import { AppShell } from "#/components/layout/app-shell/app-shell";
import { useHydrated } from "#/hooks/use-hydrated";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";

export function ChatLayout() {
	const params = useParams({ strict: false }) as { jid?: string };
	const state = useXmppState();
	const actions = useXmppActions();
	const hydrated = useHydrated();
	const activeJid = params.jid ?? null;

	useEffect(() => {
		actions.setActiveConversation(activeJid);
	}, [actions, activeJid]);

	if (!hydrated) return <LoadingScreen label="Opening Avio" />;
	if (state.connection.status !== "connected") {
		return <Navigate to="/connect" />;
	}

	return (
		<AppShell sidebar={<ChatSidebar />}>
			<Outlet />
		</AppShell>
	);
}
