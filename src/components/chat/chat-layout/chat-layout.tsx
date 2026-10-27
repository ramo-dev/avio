import { Navigate, Outlet, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChatList } from "#/components/chat/list/chat-list/chat-list";
import { LoadingScreen } from "#/components/common/loading-screen/loading-screen";
import { ChatShell } from "#/components/layout/chat-shell/chat-shell";
import { ChatWorkspace } from "#/components/layout/chat-workspace/chat-workspace";
import { useHydrated } from "#/hooks/use-hydrated";
import { useMediaQuery } from "#/hooks/use-media-query";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";

export function ChatLayout() {
	const params = useParams({ strict: false }) as { jid?: string };
	const state = useXmppState();
	const actions = useXmppActions();
	const hydrated = useHydrated();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const activeJid = params.jid ?? null;

	useEffect(() => {
		actions.setActiveConversation(activeJid);
	}, [actions, activeJid]);

	if (!hydrated || state.restorePending) {
		return <LoadingScreen label="Restoring session" />;
	}
	const connectionLost =
		state.connection.status === "idle" ||
		state.connection.status === "disconnected" ||
		state.connection.status === "error";

	if (connectionLost) {
		return <Navigate to="/connect" />;
	}

	if (isDesktop) {
		return (
			<ChatShell>
				<ChatWorkspace list={<ChatList />}>
					<Outlet />
				</ChatWorkspace>
			</ChatShell>
		);
	}

	return (
		<ChatShell showRail={false}>
			<div className="flex min-h-0 w-full flex-col overflow-hidden bg-background">
				{activeJid ? <Outlet /> : <ChatList />}
			</div>
		</ChatShell>
	);
}
