import { jidLocalPart } from "#/lib/xmpp/jid";

export function avatarInitials(name: string | undefined, jid: string): string {
	const source = name?.trim() || jidLocalPart(jid);
	const parts = source.split(/[\s._-]+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}
