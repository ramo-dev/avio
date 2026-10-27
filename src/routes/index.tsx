import { createFileRoute, Navigate } from "@tanstack/react-router";
import { LoadingScreen } from "#/components/common/loading-screen/loading-screen";
import { useHydrated } from "#/hooks/use-hydrated";
import { useXmppState } from "#/hooks/xmpp/use-xmpp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const state = useXmppState();
	const hydrated = useHydrated();

	if (!hydrated || state.restorePending) return <LoadingScreen />;
	if (state.connection.status === "connected") {
		return <Navigate to="/chat" />;
	}
	return <Navigate to="/connect" />;
}
