import type { Agent } from "stanza";
import { bareJid } from "#/lib/xmpp/jid";

/** Finds the server's text conference service through disco. */
export async function findMucService(
	client: Agent,
	domain: string,
): Promise<string | null> {
	const items = await client.getDiscoItems(domain).catch(() => null);
	for (const item of items?.items ?? []) {
		if (!item.jid) continue;
		const info = await client.getDiscoInfo(item.jid).catch(() => null);
		const isConference = info?.identities?.some(
			(identity) =>
				identity.category === "conference" && identity.type === "text",
		);
		if (isConference) return bareJid(item.jid);
	}
	return null;
}
