import { fileNameFromUrl, kindFromName } from "#/lib/chat/attachments";
import { bareJid } from "#/lib/xmpp/jid";
import type { MessageAttachment } from "#/types/attachment";
import type {
	ChatMessage,
	MessageDirection,
	MessageGroup,
	MessageReply,
	MessageStatus,
} from "#/types/chat";

export interface RawMessage {
	id?: string;
	from: string;
	to: string;
	body?: string;
	delay?: { timestamp?: Date | string };
	links?: Array<{ url?: string; description?: string }>;
	reply?: { id?: string; to?: string };
	forwarded?: boolean;
}

export interface NormalizeMessageOptions {
	accountBareJid: string;
	direction?: MessageDirection;
	isCarbon?: boolean;
	now?: number;
	idFactory?: () => string;
}

const STATUS_RANK: Record<MessageStatus, number> = {
	pending: 0,
	failed: 0,
	sent: 1,
	delivered: 2,
	read: 3,
};

export function normalizeMessage(
	raw: RawMessage,
	options: NormalizeMessageOptions,
): ChatMessage | null {
	const body = raw.body?.trim() ?? "";
	const attachments = (raw.links ?? [])
		.filter((link): link is { url: string; description?: string } =>
			Boolean(link.url),
		)
		.map((link) => {
			const name = link.description?.trim() || fileNameFromUrl(link.url);
			return {
				id: `att-${hash(link.url)}`,
				url: link.url,
				name,
				kind: kindFromName(name),
			};
		});
	if (!body && attachments.length === 0) return null;

	const direction =
		options.direction ??
		(bareJid(raw.from).toLowerCase() === options.accountBareJid.toLowerCase()
			? "outgoing"
			: "incoming");
	const conversationJid =
		direction === "outgoing"
			? bareJid(raw.to || options.accountBareJid)
			: bareJid(raw.from);
	const timestamp =
		toTimestamp(raw.delay?.timestamp) ?? options.now ?? Date.now();
	const stanzaId = raw.id?.trim() || undefined;
	const id = stanzaId ?? `msg-${hash(`${raw.from}|${timestamp}|${body}`)}`;
	const replyId = raw.reply?.id?.trim();
	const replyTo = replyId
		? { id: replyId, to: raw.reply?.to?.trim() || undefined }
		: undefined;

	return {
		id,
		stanzaId,
		conversationJid,
		from: raw.from,
		to: raw.to,
		body,
		attachments: attachments.length > 0 ? attachments : undefined,
		replyTo,
		forwarded: raw.forwarded,
		timestamp,
		direction,
		status: direction === "outgoing" ? "sent" : "delivered",
		isCarbon: options.isCarbon,
	};
}

export interface OutgoingMessageInput {
	conversationJid: string;
	from: string;
	to: string;
	body: string;
	id: string;
	timestamp: number;
	attachments?: MessageAttachment[];
	replyTo?: MessageReply;
}

export function createOutgoingMessage(
	input: OutgoingMessageInput,
): ChatMessage {
	return {
		id: input.id,
		conversationJid: input.conversationJid,
		from: input.from,
		to: input.to,
		body: input.body,
		attachments: input.attachments,
		replyTo: input.replyTo,
		timestamp: input.timestamp,
		direction: "outgoing",
		status: "pending",
	};
}

export function appendMessage(
	messages: ChatMessage[],
	message: ChatMessage,
	maxMessages = 1000,
): ChatMessage[] {
	const index = messages.findIndex((candidate) =>
		sameMessage(candidate, message),
	);
	if (index >= 0) {
		const existing = messages[index];
		const next = [...messages];
		next[index] = {
			...existing,
			...message,
			id: existing.id,
			stanzaId: existing.stanzaId ?? message.stanzaId,
			status: laterStatus(existing.status, message.status),
		};
		return next;
	}

	const next = [...messages, message];
	next.sort((a, b) => a.timestamp - b.timestamp);
	return next.length > maxMessages ? next.slice(-maxMessages) : next;
}

export function applyMessageStatus(
	messages: ChatMessage[],
	status: MessageStatus,
	keys: { id?: string; stanzaId?: string },
): ChatMessage[] {
	let changed = false;
	const next = messages.map((message) => {
		const matches =
			(keys.id && message.id === keys.id) ||
			(keys.stanzaId &&
				(message.stanzaId === keys.stanzaId || message.id === keys.stanzaId));
		if (!matches) return message;
		changed = true;
		return {
			...message,
			status:
				status === "failed" ? status : laterStatus(message.status, status),
		};
	});
	return changed ? next : messages;
}

export function applyMessageReaction(
	messages: ChatMessage[],
	messageId: string,
	senderJid: string,
	reactions: string[],
): ChatMessage[] {
	const normalized = Array.from(
		new Set(reactions.map((reaction) => reaction.trim()).filter(Boolean)),
	).slice(-1);
	let changed = false;
	const next = messages.map((message) => {
		if (message.id !== messageId && message.stanzaId !== messageId) {
			return message;
		}
		changed = true;
		const current = { ...message.reactions };
		if (normalized.length === 0) delete current[senderJid];
		else current[senderJid] = normalized;
		return {
			...message,
			reactions: Object.keys(current).length > 0 ? current : undefined,
		};
	});
	return changed ? next : messages;
}

export function applyMessageEdit(
	messages: ChatMessage[],
	messageId: string,
	body: string,
): ChatMessage[] {
	const nextBody = body.trim();
	if (!nextBody) return messages;
	let changed = false;
	const next = messages.map((message) => {
		if (
			(message.id !== messageId && message.stanzaId !== messageId) ||
			message.body === nextBody
		) {
			return message;
		}
		changed = true;
		return { ...message, body: nextBody, edited: true };
	});
	return changed ? next : messages;
}

export function groupMessages(
	messages: ChatMessage[],
	windowMs = 5 * 60 * 1000,
): MessageGroup[] {
	const groups: MessageGroup[] = [];

	for (const message of messages) {
		const last = groups.at(-1);
		const sameSender =
			last &&
			last.direction === message.direction &&
			bareJid(last.senderJid) === bareJid(message.from) &&
			message.timestamp - last.timestamp <= windowMs;

		if (last && sameSender) {
			last.messages.push(message);
			continue;
		}

		groups.push({
			id: `${message.from}-${message.timestamp}-${message.id}`,
			senderJid: message.from,
			direction: message.direction,
			timestamp: message.timestamp,
			messages: [message],
		});
	}

	return groups;
}

export function hasMessage(
	messages: ChatMessage[],
	message: ChatMessage,
): boolean {
	return messages.some((candidate) => sameMessage(candidate, message));
}

function sameMessage(a: ChatMessage, b: ChatMessage): boolean {
	if (a.id === b.id) return true;
	if (a.stanzaId && b.stanzaId) return a.stanzaId === b.stanzaId;
	return (
		a.from === b.from &&
		a.to === b.to &&
		a.timestamp === b.timestamp &&
		a.body === b.body
	);
}

function laterStatus(
	current: MessageStatus,
	next: MessageStatus,
): MessageStatus {
	if (current === "failed") return next === "failed" ? current : next;
	if (next === "failed") return next;
	return STATUS_RANK[next] >= STATUS_RANK[current] ? next : current;
}

function toTimestamp(value?: Date | string): number | undefined {
	if (!value) return undefined;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date.getTime();
}

function hash(value: string): string {
	let result = 5381;
	for (let index = 0; index < value.length; index += 1) {
		result = (result * 33) ^ value.charCodeAt(index);
	}
	return (result >>> 0).toString(36);
}
