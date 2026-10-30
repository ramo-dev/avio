import type { Agent } from "stanza";
import { createXmppError } from "#/lib/xmpp/errors";
import type { UploadService, UploadSlot } from "#/types/attachment";

export async function requestUploadService(
	client: Agent | null,
): Promise<UploadService> {
	if (!client) throw createXmppError("not-connected");
	const service = await client.getUploadService();
	return { jid: service.jid, maxSize: service.maxSize };
}

export async function requestUploadSlot(
	client: Agent | null,
	serviceJid: string,
	request: { name: string; size: number; mediaType?: string },
): Promise<UploadSlot> {
	if (!client) throw createXmppError("not-connected");
	const slot = await client.getUploadSlot(serviceJid, request);
	return {
		download: slot.download,
		upload: {
			url: slot.upload.url,
			headers: slot.upload.headers,
		},
	};
}
