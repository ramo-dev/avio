import type { Agent } from "stanza";
import type { SendMessageInput } from "#/types/store";
import type { ChatState } from "#/types/xmpp";

/** Sends a normal chat/groupchat message with receipts and markers. */
export function sendChatMessageStanza(
	agent: Agent,
	input: SendMessageInput,
): void {
	const type = input.type ?? "chat";
	agent.sendMessage({
		to: input.to,
		body: input.body,
		id: input.id,
		type,
		receipt: type === "chat" && !input.editId ? { type: "request" } : undefined,
		marker: type === "chat" && !input.editId ? { type: "markable" } : undefined,
		reply: input.replyTo,
		replace: input.editId,
		links: input.attachments?.map((attachment) => ({
			url: attachment.url,
			description: attachment.name,
		})),
	});
}

/** Sends a XEP-0333 displayed marker. */
export function sendDisplayedMarkerStanza(
	agent: Agent,
	to: string,
	messageId: string,
): void {
	agent.sendMessage({ to, marker: { id: messageId, type: "displayed" } });
}

/** Sends a XEP-0085 chat state notification for direct chats. */
export function sendChatStateStanza(
	agent: Agent,
	to: string,
	state: ChatState,
): void {
	agent.sendMessage({ to, type: "chat", chatState: state });
}
