import type { Account } from "#/types/xmpp";

const JID_PATTERN = /^(?:([^@/\s]+)@)?([^@/\s]+)(?:\/([^\s]+))?$/;

export interface JidParts {
	localPart: string;
	domain: string;
	resource?: string;
	bareJid: string;
	fullJid: string;
}

export function parseJid(value: string): JidParts | null {
	const trimmed = value.trim();
	const match = JID_PATTERN.exec(trimmed);
	if (!match) return null;

	const [, localPart, domain, resource] = match;
	if (!domain) return null;

	const bare = localPart ? `${localPart}@${domain}` : domain;
	return {
		localPart: localPart ?? "",
		domain,
		resource,
		bareJid: bare,
		fullJid: resource ? `${bare}/${resource}` : bare,
	};
}

export function isValidJid(value: string): boolean {
	return parseJid(value) !== null;
}

export function isValidAccountJid(value: string): boolean {
	const parsed = parseJid(value);
	return parsed !== null && parsed.localPart.length > 0;
}

export function toAccount(value: string): Account | null {
	const parsed = parseJid(value);
	if (!parsed || !parsed.localPart) return null;
	return {
		jid: parsed.fullJid,
		bareJid: parsed.bareJid,
		localPart: parsed.localPart,
		domain: parsed.domain,
		resource: parsed.resource,
	};
}

export function bareJid(value: string): string {
	return parseJid(value)?.bareJid ?? value;
}

export function jidLocalPart(value: string): string {
	const parsed = parseJid(value);
	return parsed?.localPart || parsed?.domain || value;
}

export function displayJidName(value: string, name?: string): string {
	if (name?.trim()) return name.trim();
	return jidLocalPart(value);
}
