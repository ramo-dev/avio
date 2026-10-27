import { bareJid } from "#/lib/xmpp/jid";
import type { XmppAdapter, XmppState } from "#/types/store";

export async function sendTypingAction({
	getState,
	adapter,
	to,
	typing,
}: {
	getState: () => XmppState;
	adapter: XmppAdapter;
	to: string;
	typing: boolean;
}): Promise<void> {
	if (getState().connection.status !== "connected") return;
	try {
		await adapter.sendChatState(bareJid(to), typing ? "composing" : "active");
	} catch {
		// Typing state is best-effort and must not surface as a send failure.
	}
}
