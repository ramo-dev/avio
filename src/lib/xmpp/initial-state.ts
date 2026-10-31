import type { XmppState } from "#/types/store";

export function createInitialState(): XmppState {
	return {
		connection: { status: "idle", error: null, jid: null },
		restorePending: true,
		account: null,
		contacts: {},
		presences: {},
		rooms: {},
		roomInviteRequests: [],
		conversations: {},
		activeJid: null,
		subscriptionRequests: [],
	};
}
