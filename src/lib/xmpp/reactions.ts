import { bareJid, displayJidName } from "#/lib/xmpp/jid";

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

/**
 * Display name for a reaction sender. Some servers (semi-anonymous rooms) only
 * expose `room@conference/nick`, so fall back to the nick when a resource is
 * present instead of showing the room's local part.
 */
export function reactionSenderName(jid: string, isSelf = false): string {
	if (isSelf) return "You";
	const resource = jid.split("/")[1];
	if (resource) return resource;
	return displayJidName(jid);
}

/** Tooltip text listing everyone who reacted, e.g. "You, Mary". */
export function reactionSenderSummary(
	userJids: string[],
	currentUserJid?: string,
): string {
	const self = currentUserJid ? bareJid(currentUserJid) : undefined;
	return userJids
		.map((jid) =>
			reactionSenderName(jid, self !== undefined && bareJid(jid) === self),
		)
		.join(", ");
}
