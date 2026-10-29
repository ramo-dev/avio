import type { Agent } from "stanza";
import { createXmppError } from "#/lib/xmpp/errors";
import { bareJid } from "#/lib/xmpp/jid";
import type { RoomInfo, XmppEvent } from "#/types/store";

interface MucAdapterOptions {
	getClient: () => Agent | null;
	getAccountBareJid: () => string;
	emit: (event: XmppEvent) => void;
}

export interface MucAdapter {
	createRoom(name: string, memberJids: string[]): Promise<RoomInfo>;
	leaveRoom(jid: string): Promise<void>;
	inviteToRoom(
		jid: string,
		memberJids: string[],
		reason?: string,
	): Promise<void>;
	joinBookmarks(): Promise<void>;
	joinInvitedRoom(jid: string, reason?: string): Promise<void>;
	getRoomNick(jid: string): string | undefined;
}

export function createMucAdapter({
	getClient,
	getAccountBareJid,
	emit,
}: MucAdapterOptions): MucAdapter {
	const roomNames = new Map<string, string>();
	const roomNicks = new Map<string, string>();

	async function createRoom(
		name: string,
		memberJids: string[],
	): Promise<RoomInfo> {
		const client = getClient();
		if (!client) throw createXmppError("not-connected");

		const account = getAccountBareJid();
		const domain = account.split("@")[1];
		if (!domain) {
			throw createXmppError(
				"unknown",
				undefined,
				"Your account has no server domain.",
			);
		}

		const service = await findMucService(client, domain);
		if (!service) {
			throw createXmppError(
				"unknown",
				undefined,
				"No group chat service was found on this server.",
			);
		}

		const nick = nickFor(account);
		const roomJid = `${slug(name)}-${randomSuffix()}@${service}`;
		roomNames.set(roomJid, name);
		roomNicks.set(roomJid, nick);
		emit({
			type: "room",
			room: { jid: roomJid, name, nick, occupants: {}, invites: {} },
		});

		try {
			await client.joinRoom(roomJid, nick);
		} catch (error) {
			roomNames.delete(roomJid);
			roomNicks.delete(roomJid);
			emit({ type: "room-left", jid: roomJid });
			throw createXmppError(
				"unknown",
				error,
				"Could not create the group chat.",
			);
		}

		// Instant rooms start locked; submit the default configuration so other
		// members can join and the room stays around after the owner leaves.
		await client
			.configureRoom(roomJid, {
				fields: [
					{
						name: "FORM_TYPE",
						type: "hidden",
						value: "http://jabber.org/protocol/muc#roomconfig",
					},
					{
						name: "muc#roomconfig_persistentroom",
						type: "boolean",
						value: true,
					},
					{
						name: "muc#roomconfig_publicroom",
						type: "boolean",
						value: true,
					},
					{
						name: "muc#roomconfig_membersonly",
						type: "boolean",
						value: false,
					},
					{
						name: "muc#roomconfig_allowinvites",
						type: "boolean",
						value: true,
					},
				],
			})
			.catch(() => undefined);

		await inviteToRoom(roomJid, memberJids, name);

		await client
			.addBookmark({ jid: roomJid, name, nick, autoJoin: true })
			.catch(() => undefined);

		return { jid: roomJid, name, nick };
	}

	async function inviteToRoom(
		jid: string,
		memberJids: string[],
		reason?: string,
	) {
		const client = getClient();
		if (!client) throw createXmppError("not-connected");

		const roomJid = bareJid(jid);
		for (const to of memberJids.map(bareJid).filter(Boolean)) {
			try {
				client.directInvite(roomJid, to, reason ? { reason } : undefined);
			} catch {
				// Continue inviting the rest of the contacts.
			}
		}
	}

	async function joinBookmarks() {
		const client = getClient();
		if (!client) return;

		const account = getAccountBareJid();
		const nick = nickFor(account);
		const bookmarks = await client.getBookmarks().catch(() => []);
		await Promise.all(
			bookmarks
				.filter((bookmark) => bookmark.autoJoin)
				.map(async (bookmark) => {
					const roomJid = bareJid(bookmark.jid);
					if (client.joinedRooms.has(roomJid)) return;

					const name = bookmark.name ?? roomJid.split("@")[0] ?? roomJid;
					const roomNick = bookmark.nick ?? nick;
					roomNames.set(roomJid, name);
					roomNicks.set(roomJid, roomNick);
					emit({
						type: "room",
						room: {
							jid: roomJid,
							name,
							nick: roomNick,
							occupants: {},
							invites: {},
						},
					});
					await client.joinRoom(roomJid, roomNick).catch(() => undefined);
				}),
		);
	}

	async function leaveRoom(jid: string) {
		const client = getClient();
		const nick = roomNicks.get(jid) ?? nickFor(getAccountBareJid());
		await client?.leaveRoom(jid, nick).catch(() => undefined);
		roomNames.delete(jid);
		roomNicks.delete(jid);
		emit({ type: "room-left", jid });
		await client?.removeBookmark(jid).catch(() => undefined);
	}

	async function joinInvitedRoom(room: string, reason?: string) {
		const client = getClient();
		if (!client) return;
		const roomJid = bareJid(room);
		if (client.joinedRooms.has(roomJid)) return;

		const account = getAccountBareJid();
		const nick = nickFor(account);
		const name = reason?.trim() || roomJid.split("@")[0] || roomJid;
		roomNames.set(roomJid, name);
		roomNicks.set(roomJid, nick);
		emit({
			type: "room",
			room: {
				jid: roomJid,
				name,
				nick,
				occupants: {},
				invites: {},
			},
		});
		await client.joinRoom(roomJid, nick).catch(() => undefined);
		await client
			.addBookmark({ jid: roomJid, name, nick, autoJoin: true })
			.catch(() => undefined);
	}

	return {
		createRoom,
		joinBookmarks,
		joinInvitedRoom,
		leaveRoom,
		inviteToRoom,
		getRoomNick: (jid) => roomNicks.get(jid),
	};
}

async function findMucService(
	client: Agent,
	domain: string,
): Promise<string | null> {
	const items = await client.getDiscoItems(domain).catch(() => null);
	for (const item of items?.items ?? []) {
		if (!item.jid) continue;
		const info = await client.getDiscoInfo(item.jid).catch(() => null);
		const isConference = info?.identities?.some(
			(identity) =>
				identity.category === "conference" && identity.type === "text",
		);
		if (isConference) return bareJid(item.jid);
	}
	return null;
}

function nickFor(accountBareJid: string): string {
	const local = accountBareJid.split("@")[0] ?? "avio";
	return local.replace(/[^\w.-]/g, "") || "avio";
}

function slug(value: string): string {
	const slugged = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 24);
	return slugged || "group";
}

function randomSuffix(): string {
	return Math.random().toString(36).slice(2, 6);
}
