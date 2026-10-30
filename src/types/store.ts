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
	RoomInvite,
	RoomInviteRequest,
	RoomOccupant,
	RoomState,
} from "#/types/chat";
import type { OmemoEncryptedMessage, OmemoPepClient } from "#/types/omemo";
import type { RoomReactionStore, StoredSession } from "#/types/storage";
import type {
	Account,
	ChatState,
	ConnectCredentials,
	ConnectionStatus,
	PresenceState,
	SubscriptionRequest,
	XmppError,
} from "#/types/xmpp";

export interface RoomInviteStore {
	load(accountJid: string): Record<string, RoomInvite[]>;
	save(accountJid: string, rooms: Record<string, RoomInvite[]>): void;
}

export interface RoomInviteRequestStore {
	load(accountJid: string): RoomInviteRequest[];
	save(accountJid: string, requests: RoomInviteRequest[]): void;
}

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
	rooms: Record<string, RoomState>;
	roomInviteRequests: RoomInviteRequest[];
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
			type: "omemo-message";
			/** Bare conversation JID. */
			jid: string;
			/** Full sender JID. */
			from: string;
			/** Stanza ID, when present. */
			id?: string;
			direction: "incoming" | "outgoing";
			envelope: OmemoEncryptedMessage;
	  }
	| {
			type: "reactions";
			jid: string;
			messageId: string;
			senderJid: string;
			/** Occupant nick for group reactions, resolved against room occupants. */
			senderNick?: string;
			reactions: string[];
	  }
	| { type: "edit"; jid: string; messageId: string; body: string }
	| { type: "history"; messages: ChatMessage[] }
	| { type: "room"; room: RoomState }
	| {
			type: "room-membership";
			jid: string;
			membership: RoomState["membership"];
	  }
	| { type: "room-members"; jid: string; memberJids: string[] }
	| {
			type: "room-occupant";
			jid: string;
			occupant: RoomOccupant;
			action: "join" | "leave" | "update";
	  }
	| { type: "room-subject"; jid: string; subject: string }
	| { type: "room-left"; jid: string }
	| { type: "room-invites"; jid: string; invites: RoomInvite[] }
	| { type: "room-invite-request"; request: RoomInviteRequest }
	| { type: "room-invite-request-cleared"; roomJid: string }
	| { type: "room-invite-declined"; roomJid: string; from: string }
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
	type?: "chat" | "groupchat";
	attachments?: MessageAttachment[];
	replyTo?: MessageReply;
	editId?: string;
}

export interface SendMessageOptions {
	replyTo?: MessageReply;
	editId?: string;
	unencryptedFallback?: boolean;
}

export interface RoomInfo {
	jid: string;
	name: string;
	nick: string;
}

export type RoomPreviewResult =
	| { status: "ok"; messages: ChatMessage[] }
	| { status: "restricted" }
	| { status: "unavailable" };

export interface XmppAdapter {
	connect(credentials: ConnectCredentials): Promise<void>;
	disconnect(): Promise<void>;
	sendMessage(input: SendMessageInput): Promise<void>;
	sendEncryptedMessage(
		to: string,
		id: string,
		envelope: OmemoEncryptedMessage,
	): Promise<void>;
	sendReaction(
		to: string,
		messageId: string,
		reactions: string[],
		roomType?: "chat" | "groupchat",
	): Promise<void>;
	forwardMessage(to: string, message: ChatMessage, id?: string): Promise<void>;
	sendChatState(to: string, state: ChatState): Promise<void>;
	getRoster(): Promise<Contact[]>;
	createRoom(name: string, memberJids: string[]): Promise<RoomInfo>;
	leaveRoom(jid: string): Promise<void>;
	inviteToRoom(
		jid: string,
		memberJids: string[],
		reason?: string,
	): Promise<void>;
	acceptRoomInvite(
		jid: string,
		reason?: string,
		invitedBy?: string,
	): Promise<void>;
	declineRoomInvite(
		jid: string,
		sender?: string,
		reason?: string,
	): Promise<void>;
	getUploadService(): Promise<UploadService>;
	getUploadSlot(
		serviceJid: string,
		request: { name: string; size: number; mediaType?: string },
	): Promise<UploadSlot>;
	addContact(jid: string): Promise<void>;
	acceptSubscription(jid: string): Promise<void>;
	/** Sends a XEP-0333 displayed marker for the latest read incoming message. */
	sendDisplayedMarker(to: string, messageId: string): Promise<void>;
	getOmemoPep(): Promise<OmemoPepClient>;
	loadRoomPreview(jid: string): Promise<RoomPreviewResult>;
	getRoomMemberJids(jid: string): Promise<string[]>;
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
	/** Sends an already-encrypted envelope. Never falls back to plaintext. */
	sendEncryptedMessage(
		to: string,
		body: string,
		envelope: OmemoEncryptedMessage,
	): Promise<ChatMessage | null>;
	/** Adds a decrypted or placeholder message to the conversation timeline. */
	addMessage(message: ChatMessage): void;
	getOmemoPep(): Promise<OmemoPepClient>;
	loadRoomPreview(jid: string): Promise<RoomPreviewResult>;
	refreshRoomMembers(jid: string): Promise<void>;
	subscribeOmemo(
		listener: (event: Extract<XmppEvent, { type: "omemo-message" }>) => void,
	): () => void;
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
	markConversationRead(jid: string): void;
	markAllRead(): void;
	deleteConversation(jid: string): void;
	deleteMessage(jid: string, messageId: string): void;
	addContact(jid: string): Promise<void>;
	acceptSubscription(jid: string): Promise<void>;
	createGroupChat(name: string, memberJids: string[]): Promise<RoomInfo>;
	leaveGroupChat(jid: string): Promise<void>;
	addGroupMembers(jid: string, memberJids: string[]): Promise<void>;
	acceptRoomInvite(jid: string): Promise<void>;
	declineRoomInvite(jid: string): Promise<void>;
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
	roomInviteStore: RoomInviteStore;
	roomInviteRequestStore: RoomInviteRequestStore;
	/** Tab-scoped room reaction snapshots; default store uses sessionStorage. */
	roomReactionStore?: RoomReactionStore;
	now?: () => number;
	idFactory?: () => string;
	reactionDelayMs?: number;
}
