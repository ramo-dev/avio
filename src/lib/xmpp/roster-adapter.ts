import type { Agent } from "stanza";
import { createXmppError } from "#/lib/xmpp/errors";
import { mapRoster } from "#/lib/xmpp/stanza-mappers";
import type { Contact } from "#/types/chat";

export function createRosterAdapter(getClient: () => Agent | null) {
	return {
		async getRoster(): Promise<Contact[]> {
			const client = getClient();
			if (!client) return [];
			const roster = await client.getRoster();
			return mapRoster(roster.items ?? []);
		},

		async addContact(jid: string) {
			const client = getClient();
			if (!client) throw createXmppError("not-connected");
			client.subscribe(jid);
		},

		async acceptSubscription(jid: string) {
			const client = getClient();
			if (!client) throw createXmppError("not-connected");
			client.acceptSubscription(jid);
			// Granting presence is one direction only; ask for theirs in return so
			// both sides see each other online. This is the usual mutual-subscription
			// behavior for a contact request.
			client.subscribe(jid);
		},
	};
}
