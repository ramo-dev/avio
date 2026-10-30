import { displayJidName } from "#/lib/xmpp/jid";
import { isSelfJid } from "#/lib/xmpp/reducers";
import type { XmppState } from "#/types/store";

export interface Contact {
	jid: string;
	name: string;
}

export interface CreateGroupDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function initials(name: string): string {
	const letters = name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
	return letters || "?";
}

/** Roster contacts eligible for a new group, sorted by display name. */
export function groupContacts(state: XmppState): Contact[] {
	return Object.values(state.contacts)
		.filter((contact) => !isSelfJid(state, contact.jid))
		.map((contact) => ({
			jid: contact.jid,
			name: displayJidName(contact.jid, contact.name),
		}))
		.sort((left, right) => left.name.localeCompare(right.name));
}

/** Filters by display name or JID, case-insensitively. */
export function filterContacts(contacts: Contact[], query: string): Contact[] {
	const needle = query.trim().toLowerCase();
	if (!needle) return contacts;
	return contacts.filter(
		(contact) =>
			contact.name.toLowerCase().includes(needle) ||
			contact.jid.toLowerCase().includes(needle),
	);
}

/** Toggles one JID in an immutable selection set. */
export function toggleSelection(
	current: Set<string>,
	jid: string,
): Set<string> {
	const next = new Set(current);
	if (next.has(jid)) next.delete(jid);
	else next.add(jid);
	return next;
}

/** Adds or removes every JID in an immutable selection set. */
export function setVisibleSelection(
	current: Set<string>,
	jids: string[],
	checked: boolean,
): Set<string> {
	const next = new Set(current);
	for (const jid of jids) {
		if (checked) next.add(jid);
		else next.delete(jid);
	}
	return next;
}
