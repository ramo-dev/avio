/**
 * What the right side panel is showing. This is the URL-persisted form: the
 * panel object (title, description, content) is derived from it, so a refresh
 * can restore the panel for the selected conversation.
 */
export type SidePanelSelection =
	| { kind: "contact"; jid: string }
	| { kind: "room"; jid: string };
