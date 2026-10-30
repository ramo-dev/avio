import { useEffect, useMemo } from "react";
import type { ChatMessage } from "#/types/chat";

/**
 * Sends a displayed marker for the latest incoming message while the
 * conversation is open and the tab is visible (XEP-0333).
 */
export function useMarkConversationRead(
	jid: string,
	messages: ChatMessage[],
	markRead: (jid: string) => void,
): void {
	const lastIncomingStanzaId = useMemo(() => {
		for (let index = messages.length - 1; index >= 0; index -= 1) {
			const message = messages[index];
			if (message.direction === "incoming" && message.stanzaId) {
				return message.stanzaId;
			}
		}
		return undefined;
	}, [messages]);

	useEffect(() => {
		if (!lastIncomingStanzaId) return;
		function mark() {
			if (document.visibilityState === "visible") markRead(jid);
		}
		mark();
		document.addEventListener("visibilitychange", mark);
		return () => document.removeEventListener("visibilitychange", mark);
	}, [jid, lastIncomingStanzaId, markRead]);
}
