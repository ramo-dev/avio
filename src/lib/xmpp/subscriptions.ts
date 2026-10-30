import { bareJid } from "#/lib/xmpp/jid";
import type { XmppState } from "#/types/store";

/**
 * True when we already asked for (or receive) this contact's presence.
 * Used to complete mutual subscriptions without a second confirmation.
 */
export function hasOutgoingSubscription(
	state: XmppState,
	jid: string,
): boolean {
	const contact = state.contacts[bareJid(jid)];
	return contact?.subscription === "to" || contact?.subscription === "both";
}
