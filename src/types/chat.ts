import type { MessageAttachment } from "#/types/attachment";
import type { PresenceState } from "#/types/xmpp";

export type MessageStatus =
	| "pending"
	| "sent"
	| "delivered"
	| "read"
	| "failed";

export type MessageDirection = "incoming" | "outgoing";

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
	timestamp: number;
	direction: MessageDirection;
	status: MessageStatus;
	isCarbon?: boolean;
	error?: string;
}

export interface Contact {
	jid: string;
	name?: string;
	subscription: "none" | "to" | "from" | "both";
	presence: PresenceState;
}

export interface Conversation {
	jid: string;
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

export interface ConversationSummary {
	jid: string;
	name: string;
	lastMessage?: ChatMessage;
	unread: number;
	lastActivity: number;
	presence: PresenceState;
	typing: boolean;
}
