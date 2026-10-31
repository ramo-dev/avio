import { bareJid } from "#/lib/xmpp/jid";
import type { SidePanelSelection } from "#/types/side-panel";
import type { XmppState } from "#/types/store";

export const SIDE_PANEL_PARAM = "panel";
const MAX_PARAM_LENGTH = 400;

/**
 * Route search validator shared by the /chat routes. Only the `panel` param is
 * preserved; every other key is dropped so the validator fully defines the
 * route's search contract.
 */
export function validateSidePanelSearch(
	search: Record<string, unknown>,
): Partial<Record<typeof SIDE_PANEL_PARAM, string>> {
	const value = search[SIDE_PANEL_PARAM];
	if (Array.isArray(value)) {
		const first = value[0];
		if (typeof first === "string") return { [SIDE_PANEL_PARAM]: first };
		return {};
	}
	return typeof value === "string" ? { [SIDE_PANEL_PARAM]: value } : {};
}

/**
 * Encodes a selection for the `panel` search param. The router serializes the
 * search value, so do not percent-encode here or the URL is double-encoded.
 */
export function encodeSidePanelParam(selection: SidePanelSelection): string {
	return `${selection.kind}:${selection.jid}`;
}

/** Parses the `panel` search param. Anything invalid yields null. */
export function parseSidePanelParam(value: unknown): SidePanelSelection | null {
	if (typeof value !== "string") return null;
	const decoded =
		value.length <= MAX_PARAM_LENGTH ? decodeURIComponent(value) : "";
	const separator = decoded.indexOf(":");
	if (separator <= 0) return null;

	const kind = decoded.slice(0, separator);
	const jid = decoded.slice(separator + 1);
	if (kind !== "contact" && kind !== "room") return null;
	if (!isBareJidLike(jid)) return null;
	return { kind, jid };
}

/** Bare JIDs only. Info panels never target a specific resource. */
function isBareJidLike(jid: string): boolean {
	return (
		jid.length > 0 &&
		jid.length <= 3071 &&
		!/[\s/#"'<>\\]/.test(jid) &&
		jid === bareJid(jid)
	);
}

export interface SidePanelMeta {
	title: string;
	description: string;
}

/**
 * Resolves drawer meta for a selection. Conversation names come from the XMPP
 * state when available, so a restored panel shows the same title as before the
 * refresh.
 */
export function sidePanelMeta(
	selection: SidePanelSelection,
	state: Pick<XmppState, "rooms">,
): SidePanelMeta {
	if (selection.kind === "contact") {
		return {
			title: "Contact info",
			description: "Direct XMPP conversation",
		};
	}
	const room = state.rooms[selection.jid];
	return {
		title: room?.name ?? selection.jid.split("@")[0],
		description: "Group chat",
	};
}
