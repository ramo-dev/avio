import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createSessionStore } from "#/lib/storage/session";
import { createAttachmentUploader } from "#/lib/uploads/attachment-uploader";
import { createLazyAdapter } from "#/lib/xmpp/lazy-adapter";
import { createXmppStore } from "#/lib/xmpp/store";
import type { XmppStore } from "#/types/store";

const XmppContext = createContext<XmppStore | null>(null);

export function XmppProvider({ children }: { children: ReactNode }) {
	const [store] = useState(() => {
		const adapter = createLazyAdapter();
		return createXmppStore({
			adapter,
			uploader: createAttachmentUploader(adapter),
			sessionStore: createSessionStore(),
		});
	});
	const restored = useRef(false);

	useEffect(() => {
		if (restored.current) return;
		restored.current = true;
		void store.restoreSession();
	}, [store]);

	return <XmppContext.Provider value={store}>{children}</XmppContext.Provider>;
}

export function useXmppStore(): XmppStore {
	const store = useContext(XmppContext);
	if (!store) {
		throw new Error("useXmppStore must be used inside XmppProvider");
	}
	return store;
}
