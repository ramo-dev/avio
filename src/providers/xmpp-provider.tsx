import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { createSessionStore } from "#/lib/storage/session";
import { createLazyAdapter } from "#/lib/xmpp/lazy-adapter";
import { createXmppStore } from "#/lib/xmpp/store";
import type { XmppStore } from "#/types/store";

const XmppContext = createContext<XmppStore | null>(null);

export function XmppProvider({ children }: { children: ReactNode }) {
	const [store] = useState(() =>
		createXmppStore({
			adapter: createLazyAdapter(),
			sessionStore: createSessionStore(),
		}),
	);

	return <XmppContext.Provider value={store}>{children}</XmppContext.Provider>;
}

export function useXmppStore(): XmppStore {
	const store = useContext(XmppContext);
	if (!store) {
		throw new Error("useXmppStore must be used inside XmppProvider");
	}
	return store;
}
