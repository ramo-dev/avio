import { vi } from "vitest";
import { createMemoryRoomInviteRequestStore } from "#/lib/storage/room-invite-requests";
import { createMemoryRoomInviteStore } from "#/lib/storage/room-invites";
import { createMemorySessionStore } from "#/lib/storage/session";
import { createXmppStore } from "#/lib/xmpp/store";
import type { SendMessageInput, XmppAdapter, XmppEvent } from "#/types/store";

export function createStoreHarness(options: { idFactory?: () => string } = {}) {
	let listener: ((event: XmppEvent) => void) | null = null;
	const sent: SendMessageInput[] = [];
	const sessionStore = createMemorySessionStore();
	const roomInviteStore = createMemoryRoomInviteStore();
	const roomInviteRequestStore = createMemoryRoomInviteRequestStore();

	const adapter: XmppAdapter = {
		connect: vi.fn(async () => undefined),
		disconnect: vi.fn(async () => undefined),
		sendMessage: vi.fn(async (input: SendMessageInput) => {
			sent.push(input);
		}),
		sendEncryptedMessage: vi.fn(async () => undefined),
		sendReaction: vi.fn(async () => undefined),
		forwardMessage: vi.fn(async () => undefined),
		sendChatState: vi.fn(async () => undefined),
		getRoster: vi.fn(async () => [
			{
				jid: "bob@example.com",
				name: "Bob",
				subscription: "both" as const,
				groups: ["Work"],
				presence: { show: "offline" as const, priority: 0 },
			},
		]),
		getUploadService: vi.fn(async () => ({
			jid: "upload.example.com",
			maxSize: 10 * 1024 * 1024,
		})),
		getUploadSlot: vi.fn(async () => ({
			download: "https://cdn.example.com/file.png",
			upload: { url: "https://upload.example.com/file.png" },
		})),
		addContact: vi.fn(async () => undefined),
		acceptSubscription: vi.fn(async () => undefined),
		createRoom: vi.fn(async (name: string) => ({
			jid: "room@conference.example.com",
			name,
			nick: "alice",
		})),
		leaveRoom: vi.fn(async () => undefined),
		inviteToRoom: vi.fn(async () => undefined),
		acceptRoomInvite: vi.fn(async () => undefined),
		declineRoomInvite: vi.fn(async () => undefined),
		getOmemoPep: vi.fn(async () => {
			throw new Error("OMEMO PEP is unavailable in the store test harness.");
		}),
		loadRoomPreview: vi.fn(async () => ({
			status: "ok" as const,
			messages: [],
		})),
		getRoomMemberJids: vi.fn(async () => []),
		subscribe: (next) => {
			listener = next;
			return () => {
				listener = null;
			};
		},
	};

	const store = createXmppStore({
		adapter,
		uploader: {
			upload: vi.fn(async (file: File) => ({
				id: "attachment-1",
				url: "https://cdn.example.com/file.png",
				name: file.name,
				kind: "image" as const,
				mimeType: file.type,
				size: file.size,
			})),
		},
		sessionStore,
		roomInviteStore,
		roomInviteRequestStore,
		now: () => 10_000,
		idFactory: options.idFactory ?? (() => "fixed"),
		reactionDelayMs: 0,
	});

	return {
		store,
		adapter,
		sessionStore,
		roomInviteStore,
		roomInviteRequestStore,
		sent,
		emit: (event: XmppEvent) => listener?.(event),
	};
}
