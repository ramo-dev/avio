import type { Agent } from "stanza";
import { bareJid } from "#/lib/xmpp/jid";

/** Queries owner/admin/member affiliations and returns bare member JIDs. */
export async function getRoomMemberJids(
	client: Agent,
	room: string,
): Promise<string[]> {
	const roomJid = bareJid(room);
	const jids = new Set<string>();
	for (const affiliation of ["owner", "admin", "member"] as const) {
		const result = await client
			.getRoomMembers(roomJid, { affiliation })
			.catch(() => null);
		for (const user of result?.muc?.users ?? []) {
			if (user.jid) jids.add(bareJid(user.jid));
		}
	}
	return [...jids];
}
