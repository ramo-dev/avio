export type ConnectionStatus =
	| "idle"
	| "connecting"
	| "connected"
	| "reconnecting"
	| "disconnected"
	| "error";

export type PresenceShow =
	| "available"
	| "chat"
	| "away"
	| "dnd"
	| "xa"
	| "offline";

export interface PresenceState {
	show: PresenceShow;
	status?: string;
	priority: number;
	lastSeen?: number;
}

export interface Account {
	jid: string;
	bareJid: string;
	localPart: string;
	domain: string;
	resource?: string;
}

export interface ConnectCredentials {
	jid: string;
	password: string;
	websocketUrl?: string;
	boshUrl?: string;
	resource?: string;
}

export interface RosterEntry {
	jid: string;
	name?: string;
	subscription: "none" | "to" | "from" | "both";
	presence: PresenceState;
}

export type XmppErrorCode =
	| "invalid-jid"
	| "auth-failed"
	| "connection-failed"
	| "disconnected"
	| "not-connected"
	| "send-failed"
	| "unknown";

export interface XmppError {
	code: XmppErrorCode;
	message: string;
	cause?: unknown;
}

export type ChatState = "active" | "composing" | "paused" | "inactive" | "gone";

export interface SubscriptionRequest {
	jid: string;
	name?: string;
}
