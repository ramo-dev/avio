import type { MessageAttachment } from "#/types/attachment";
import type { PresenceState } from "#/types/xmpp";

export type MessageStatus =
	| "pending"
	| "sent"
	| "delivered"
	| "read"
	| "failed";

export type MessageDirection = "incoming" | "outgoing";

export type ConversationKind = "direct" | "group";

export interface RoomOccupant {
	nick: string;
	jid?: string;
	role?: string;
	affiliation?: string;
	presence: PresenceState;
}

export type RoomInviteStatus = "pending" | "accepted" | "declined";

export interface RoomInvite {
	jid: string;
	name?: string;
	status: RoomInviteStatus;
	invitedAt: number;
	/** Bare JID of the account that sent the invitation. */
	invitedBy?: string;
}

export interface RoomInviteRequest {
	roomJid: string;
	roomName: string;
	from: string;
	reason?: string;
	receivedAt: number;
}

export type RoomMembership = "joining" | "joined";

export interface RoomState {
	jid: string;
	name: string;
	nick: string;
	subject?: string;
	occupants: Record<string, RoomOccupant>;
	invites: Record<string, RoomInvite>;
	membership?: RoomMembership;
	/** Server-side member JIDs reconciled for owners/admins. */
	memberJids?: string[];
	/** Bare JID of the account that invited the local user, when applicable. */
	invitedBy?: string;
}

export type MessagePosition = "single" | "first" | "middle" | "last";

export interface MessageReply {
	id: string;
	to?: string;
}

export interface ChatMessage {
	id: string;
	stanzaId?: string;
	conversationJid: string;
	from: string;
	to: string;
	body: string;
	attachments?: MessageAttachment[];
	replyTo?: MessageReply;
	reactions?: Record<string, string[]>;
	edited?: boolean;
	forwarded?: boolean;
	senderNick?: string;
	timestamp: number;
	direction: MessageDirection;
	status: MessageStatus;
	isCarbon?: boolean;
	encrypted?: boolean;
	/** Whether the sender device identity is explicitly trusted. */
	trusted?: boolean;
	/** Sent unencrypted because no OMEMO recipient device was available. */
	unencryptedFallback?: boolean;
	/** Safe, human-readable decryption failure reason. */
	decryptionError?: string;
	error?: string;
}

export interface Contact {
	jid: string;
	name?: string;
	subscription: "none" | "to" | "from" | "both";
	groups: string[];
	presence: PresenceState;
}

export interface Conversation {
	jid: string;
	kind: ConversationKind;
	title?: string;
	nick?: string;
	messages: ChatMessage[];
	unread: number;
	lastActivity: number;
	typing: boolean;
}

export interface MessageGroup {
	id: string;
	senderJid: string;
	direction: MessageDirection;
	timestamp: number;
	messages: ChatMessage[];
}

export type TimelineItem =
	| { kind: "day"; id: string; timestamp: number }
	| { kind: "group"; id: string; group: MessageGroup };

export interface ConversationParticipant {
	jid?: string;
	name: string;
}

export interface ConversationSummary {
	jid: string;
	name: string;
	kind: ConversationKind;
	lastMessage?: ChatMessage;
	unread: number;
	lastActivity: number;
	presence: PresenceState;
	typing: boolean;
	memberCount?: number;
	participants?: ConversationParticipant[];
}
