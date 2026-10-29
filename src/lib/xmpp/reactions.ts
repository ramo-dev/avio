import { bareJid } from "#/lib/xmpp/jid";

export function selectUserReactions(
	reactions: Record<string, string[]> | undefined,
	jid?: string,
): string[] {
	if (!reactions || !jid) return [];
	const target = bareJid(jid);
	const key = Object.keys(reactions).find(
		(candidate) => bareJid(candidate) === target,
	);
	return key ? (reactions[key] ?? []) : [];
}
