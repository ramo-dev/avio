import { useCallback, useEffect, useRef } from "react";
import { useXmppStore } from "#/providers/xmpp-provider";

const TYPING_TIMEOUT_MS = 1500;

export function useTyping(jid: string, enabled: boolean): () => void {
	const store = useXmppStore();
	const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const active = useRef(false);

	const stop = useCallback(() => {
		if (timeout.current) {
			clearTimeout(timeout.current);
			timeout.current = null;
		}
		if (active.current) {
			active.current = false;
			void store.sendTyping(jid, false);
		}
	}, [jid, store]);

	useEffect(() => {
		return () => {
			if (timeout.current) clearTimeout(timeout.current);
			if (active.current) void store.sendTyping(jid, false);
		};
	}, [jid, store]);

	return useCallback(() => {
		if (!enabled) return;
		if (!active.current) {
			active.current = true;
			void store.sendTyping(jid, true);
		}
		if (timeout.current) clearTimeout(timeout.current);
		timeout.current = setTimeout(stop, TYPING_TIMEOUT_MS);
	}, [enabled, jid, stop, store]);
}
