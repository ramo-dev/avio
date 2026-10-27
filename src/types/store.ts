import type {
	ChatMessage,
	Contact,
	Conversation,
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
	account: Account | null;
	contacts: Record<string, Contact>;
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
}

export interface XmppAdapter {
	connect(credentials: ConnectCredentials): Promise<void>;
	disconnect(): Promise<void>;
	sendMessage(input: SendMessageInput): Promise<void>;
	sendChatState(to: string, state: ChatState): Promise<void>;
	getRoster(): Promise<Contact[]>;
	addContact(jid: string): Promise<void>;
	acceptSubscription(jid: string): Promise<void>;
	subscribe(listener: (event: XmppEvent) => void): () => void;
}

export interface XmppStore {
	getState(): XmppState;
	subscribe(listener: () => void): () => void;
	connect(credentials: ConnectCredentials): Promise<void>;
	disconnect(): Promise<void>;
	sendMessage(to: string, body: string): Promise<ChatMessage | null>;
	retryMessage(messageId: string): Promise<void>;
	sendTyping(to: string, typing: boolean): Promise<void>;
	setActiveConversation(jid: string | null): void;
	addContact(jid: string): Promise<void>;
	acceptSubscription(jid: string): Promise<void>;
	clearError(): void;
}

export interface SessionStore {
	load(): StoredSession | null;
	save(session: StoredSession): void;
	clear(): void;
}

export interface XmppStoreDeps {
	adapter: XmppAdapter;
	sessionStore: SessionStore;
	now?: () => number;
	idFactory?: () => string;
}
