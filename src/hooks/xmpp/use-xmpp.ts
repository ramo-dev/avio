import { useSyncExternalStore } from "react";
import { useXmppStore } from "#/providers/xmpp-provider";
import type { XmppState, XmppStore } from "#/types/store";

export function useXmppState(): XmppState {
	const store = useXmppStore();
	return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export function useXmppActions(): XmppStore {
	return useXmppStore();
}
