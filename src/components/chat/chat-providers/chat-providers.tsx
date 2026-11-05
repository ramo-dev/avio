import { lazy, type ReactNode, Suspense } from "react";
import { LoadingScreen } from "#/components/common/loading-screen/loading-screen";
import { useXmppState } from "#/hooks/xmpp/use-xmpp";

const LazyOmemoProvider = lazy(async () => {
	const { OmemoProvider } = await import("#/providers/omemo-provider");
	return { default: OmemoProvider };
});

/**
 * Scopes the OMEMO provider to chat routes and keeps libomemo.js out of the
 * connect flow. The provider is mounted as soon as a session starts connecting
 * so chat children never render without the context they depend on.
 */
export function ChatProviders({ children }: { children: ReactNode }) {
	const state = useXmppState();
	const accountActive =
		state.connection.status === "connected" ||
		state.connection.status === "connecting" ||
		state.connection.status === "reconnecting";

	if (!accountActive) {
		return <>{children}</>;
	}

	return (
		<Suspense fallback={<LoadingScreen label="Preparing encryption" />}>
			<LazyOmemoProvider>{children}</LazyOmemoProvider>
		</Suspense>
	);
}
