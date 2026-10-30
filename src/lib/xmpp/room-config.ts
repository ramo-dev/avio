import type { DataFormField } from "stanza/protocol";

/**
 * Owner room configuration submitted once at creation. This is persisted room
 * state: members-only rooms stay private, and non-anonymous rooms expose real
 * JIDs so reactions and messages attribute to their owners (also a group
 * OMEMO prerequisite).
 */
export const ROOM_CONFIGURATION_FIELDS: DataFormField[] = [
	{
		name: "FORM_TYPE",
		type: "hidden",
		value: "http://jabber.org/protocol/muc#roomconfig",
	},
	{
		name: "muc#roomconfig_persistentroom",
		type: "boolean",
		value: true,
	},
	{
		name: "muc#roomconfig_publicroom",
		type: "boolean",
		value: false,
	},
	{
		name: "muc#roomconfig_membersonly",
		type: "boolean",
		value: true,
	},
	{
		name: "muc#roomconfig_allowinvites",
		type: "boolean",
		value: true,
	},
	{
		// Prosody's MUC uses this list-single field ("anyone" is the
		// non-anonymous variant) in addition to the XEP-0045 form field.
		name: "muc#roomconfig_whois",
		type: "list-single",
		value: "anyone",
	},
	{
		name: "muc#roomconfig_nonanonymous",
		type: "boolean",
		value: true,
	},
];

/**
 * Room config decides member-only access and real-JID exposure; surface the
 * failure (code only, never a stanza) so it is not lost silently.
 */
export function warnRoomConfigFailure(error: unknown): void {
	const condition =
		typeof error === "object" &&
		error !== null &&
		"condition" in error &&
		typeof (error as { condition?: unknown }).condition === "string"
			? (error as { condition: string }).condition
			: "unknown";
	console.warn("MUC room configuration failed:", condition);
}
