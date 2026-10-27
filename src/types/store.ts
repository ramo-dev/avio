import type {
	AttachmentUploader,
	MessageAttachment,
	UploadService,
	UploadSlot,
} from "#/types/attachment";
import type {
	ChatMessage,
	Contact,
	Conversation,
	MessageReply,
	MessageStatus,
} from "#/types/chat";
import type { StoredSession } from "#/types/storage";
import type {
	Account,
	ChatState,
	ConnectCredentials,
	ConnectionStatus,
	PresenceState,
	SubscriptionRequest,
	XmppError,
} from "#/types/xmpp";

export interface ConnectionState {
	status: ConnectionStatus;
	error: XmppError | null;
	jid: string | null;
}

export interface XmppState {
	connection: ConnectionState;
	restorePending: boolean;
	account: Account | null;
	contacts: Record<string, Contact>;
	presences: Record<string, Record<string, PresenceState>>;
	conversations: Record<string, Conversation>;
	activeJid: string | null;
	subscriptionRequests: SubscriptionRequest[];
}

export type XmppEvent =
	| {
			type: "connection";
			status: ConnectionStatus;
			error?: XmppError;
			jid?: string;
	  }
	| { type: "roster"; contacts: Contact[] }
	| { type: "presence"; jid: string; presence: PresenceState }
	| { type: "message"; message: ChatMessage }
	| {
			type: "reactions";
			jid: string;
			messageId: string;
			senderJid: string;
			reactions: string[];
	  }
	| { type: "edit"; jid: string; messageId: string; body: string }
	| { type: "history"; messages: ChatMessage[] }
	| {
			type: "message-status";
			id?: string;
			stanzaId?: string;
			status: MessageStatus;
	  }
	| { type: "typing"; jid: string; typing: boolean }
	| {
			type: "subscription";
			jid: string;
			action: "subscribe" | "subscribed" | "unsubscribe" | "unsubscribed";
	  };

export interface SendMessageInput {
	to: string;
	body: string;
	id: string;
	attachments?: MessageAttachment[];
	replyTo?: MessageReply;
	editId?: string;
}

export interface SendMessageOptions {
	replyTo?: MessageReply;
	editId?: string;
}

export interface XmppAdapter {
	connect(credentials: ConnectCredentials): Promise<void>;
	disconnect(): Promise<void>;
	sendMessage(input: SendMessageInput): Promise<void>;
	sendReaction(
		to: string,
		messageId: string,
		reactions: string[],
	): Promise<void>;
	forwardMessage(to: string, message: ChatMessage): Promise<void>;
	sendChatState(to: string, state: ChatState): Promise<void>;
	getRoster(): Promise<Contact[]>;
	getUploadService(): Promise<UploadService>;
	getUploadSlot(
		serviceJid: string,
		request: { name: string; size: number; mediaType?: string },
	): Promise<UploadSlot>;
	addContact(jid: string): Promise<void>;
	acceptSubscription(jid: string): Promise<void>;
	subscribe(listener: (event: XmppEvent) => void): () => void;
}

export interface XmppStore {
	getState(): XmppState;
	subscribe(listener: () => void): () => void;
	connect(credentials: ConnectCredentials): Promise<void>;
	restoreSession(): Promise<void>;
	disconnect(): Promise<void>;
	sendMessage(
		to: string,
		body: string,
		attachments?: MessageAttachment[],
		options?: SendMessageOptions,
	): Promise<ChatMessage | null>;
	uploadAttachment(
		file: File,
		onProgress?: (percent: number) => void,
	): Promise<MessageAttachment>;
	retryMessage(messageId: string): Promise<void>;
	toggleReaction(to: string, messageId: string, emoji: string): Promise<void>;
	forwardMessage(to: string, message: ChatMessage): Promise<ChatMessage | null>;
	sendTyping(to: string, typing: boolean): Promise<void>;
	setActiveConversation(jid: string | null): void;
	ensureConversation(jid: string): void;
	markConversationUnread(jid: string): void;
	markAllRead(): void;
	deleteConversation(jid: string): void;
	deleteMessage(jid: string, messageId: string): void;
	addContact(jid: string): Promise<void>;
	acceptSubscription(jid: string): Promise<void>;
	clearError(): void;
}

export interface SessionStore {
	load(): StoredSession | null;
	save(session: StoredSession): void;
	loadPassword(): string | null;
	savePassword(password: string): void;
	clearPassword(): void;
	clear(): void;
}

export interface XmppStoreDeps {
	adapter: XmppAdapter;
	uploader: AttachmentUploader;
	sessionStore: SessionStore;
	now?: () => number;
	idFactory?: () => string;
}
