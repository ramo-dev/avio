import type { Agent } from "stanza";
import { JXT } from "stanza";

export const REPLY_NAMESPACE = "urn:xmpp:reply:0";
export const REACTIONS_NAMESPACE = "urn:xmpp:reactions:0";

export function registerMessageExtensions(agent: Agent): void {
	agent.stanzas.define([
		{
			namespace: REPLY_NAMESPACE,
			element: "reply",
			path: "message.reply",
			fields: {
				id: JXT.attribute("id"),
				to: JXT.attribute("to"),
			},
		},
		{
			namespace: REACTIONS_NAMESPACE,
			element: "reactions",
			path: "message.reactions",
			fields: {
				id: JXT.attribute("id"),
				reactions: JXT.multipleChildText(REACTIONS_NAMESPACE, "reaction"),
			},
		},
	]);
}
