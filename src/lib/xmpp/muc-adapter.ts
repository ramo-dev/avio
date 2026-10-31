import type { Agent } from "stanza";
import { createXmppError } from "#/lib/xmpp/errors";
import { bareJid } from "#/lib/xmpp/jid";
import { findMucService } from "#/lib/xmpp/muc-discovery";
import {
	ROOM_CONFIGURATION_FIELDS,
	warnRoomConfigFailure,
} from "#/lib/xmpp/room-config";
import { getRoomMemberJids as queryRoomMemberJids } from "#/lib/xmpp/room-member-query";
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
	joinInvitedRoom(
		jid: string,
		reason?: string,
		invitedBy?: string,
	): Promise<void>;
	declineInvite(jid: string, sender: string, reason?: string): void;
	getRoomMemberJids(jid: string): Promise<string[]>;
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
			room: {
				jid: roomJid,
				name,
				nick,
				occupants: {},
				invites: {},
				membership: "joining",
			},
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
		emit({ type: "room-membership", jid: roomJid, membership: "joined" });

		// Instant rooms start locked; submit the default configuration so other
		// members can join and the room stays around after the owner leaves.
		await client
			.configureRoom(roomJid, {
				fields: [...ROOM_CONFIGURATION_FIELDS],
			})
			.catch(warnRoomConfigFailure);

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
				await client
					.setRoomAffiliation(roomJid, to, "member")
					.catch(() => undefined);
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
							membership: "joining",
						},
					});
					const joined = await client
						.joinRoom(roomJid, roomNick)
						.then(() => true)
						.catch(() => false);
					if (joined) {
						emit({
							type: "room-membership",
							jid: roomJid,
							membership: "joined",
						});
					}
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

	async function joinInvitedRoom(
		room: string,
		reason?: string,
		invitedBy?: string,
	) {
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
				membership: "joining",
				invitedBy: invitedBy ? bareJid(invitedBy) : undefined,
			},
		});
		try {
			await client.joinRoom(roomJid, nick);
		} catch (error) {
			emit({ type: "room-left", jid: roomJid });
			throw createXmppError("unknown", error, "Could not join the group chat.");
		}
		emit({ type: "room-membership", jid: roomJid, membership: "joined" });
		await client
			.addBookmark({ jid: roomJid, name, nick, autoJoin: true })
			.catch(() => undefined);
	}

	function declineInvite(jid: string, sender: string, reason?: string) {
		const client = getClient();
		if (!client) return;
		client.declineInvite(bareJid(jid), bareJid(sender), reason);
	}

	async function getRoomMemberJids(room: string): Promise<string[]> {
		const client = getClient();
		if (!client) return [];
		return queryRoomMemberJids(client, room);
	}

	return {
		createRoom,
		joinBookmarks,
		joinInvitedRoom,
		declineInvite,
		getRoomMemberJids,
		leaveRoom,
		inviteToRoom,
		getRoomNick: (jid) => roomNicks.get(jid),
	};
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
