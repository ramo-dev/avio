import type { SessionStore, XmppState } from "#/types/store";
import type { ConnectCredentials } from "#/types/xmpp";

export async function restoreSavedSession({
	getState,
	setState,
	sessionStore,
	connect,
}: {
	getState: () => XmppState;
	setState: (state: XmppState) => void;
	sessionStore: SessionStore;
	connect: (credentials: ConnectCredentials) => Promise<void>;
}): Promise<void> {
	const state = getState();
	if (state.connection.status !== "idle") {
		setState({ ...state, restorePending: false });
		return;
	}

	const session = sessionStore.load();
	const password = sessionStore.loadPassword();
	if (!session || !password) {
		setState({ ...state, restorePending: false });
		return;
	}

	try {
		await connect({
			jid: session.jid,
			password,
			websocketUrl: session.websocketUrl,
			boshUrl: session.boshUrl,
			resource: session.resource,
		});
	} finally {
		const current = getState();
		if (current.restorePending) {
			setState({ ...current, restorePending: false });
		}
	}
}
