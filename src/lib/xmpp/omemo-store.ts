import type { XmppAdapter, XmppEvent } from "#/types/store";

export type OmemoMessageEvent = Extract<XmppEvent, { type: "omemo-message" }>;

/**
 * Routes adapter events: OMEMO envelopes go to their own subscribers, every
 * other event keeps flowing to the reducer.
 *
 * OMEMO events are never reduced into the transcript directly because they
 * still need asynchronous decryption in the provider.
 */
export function createOmemoStoreBridge(
	adapter: XmppAdapter,
	forward: (event: XmppEvent) => void,
) {
	const listeners = new Set<(event: OmemoMessageEvent) => void>();

	adapter.subscribe((event) => {
		if (event.type === "omemo-message") {
			for (const listener of listeners) listener(event);
			return;
		}
		forward(event);
	});

	return {
		getOmemoPep: () => adapter.getOmemoPep(),
		subscribe(listener: (event: OmemoMessageEvent) => void) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}
