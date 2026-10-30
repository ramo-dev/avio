import type { Agent } from "stanza";
import { bareJid } from "#/lib/xmpp/jid";
import { mapRoomHistory } from "#/lib/xmpp/stanza-mappers";
import type { RoomPreviewResult } from "#/types/store";

/** Loads a best-effort read-only room preview through MAM without joining. */
export async function loadRoomPreview(
	client: Agent,
	jid: string,
	accountBareJid: string,
): Promise<RoomPreviewResult> {
	try {
		const history = await client.searchHistory(bareJid(jid), {
			paging: { max: 50, before: "" },
		});
		return {
			status: "ok",
			messages: mapRoomHistory(history, accountBareJid),
		};
	} catch (error) {
		const condition = stanzaErrorCondition(error);
		if (
			condition === "forbidden" ||
			condition === "not-authorized" ||
			condition === "item-not-found"
		) {
			return { status: "restricted" };
		}
		return { status: "unavailable" };
	}
}

function stanzaErrorCondition(error: unknown): string | undefined {
	if (typeof error !== "object" || error === null) return undefined;
	const errorPayload = (error as { error?: unknown }).error;
	if (typeof errorPayload !== "object" || errorPayload === null)
		return undefined;
	const condition = (errorPayload as { condition?: unknown }).condition;
	return typeof condition === "string" ? condition : undefined;
}
