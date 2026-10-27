import type { ConversationSummary, MessageStatus } from "#/types/chat";

export interface ConversationPreview {
	text: string;
	prefix?: string;
	status?: MessageStatus;
	typing: boolean;
}

export function conversationPreview(
	summary: ConversationSummary,
): ConversationPreview {
	if (summary.typing) {
		return { text: "typing…", typing: true };
	}

	const message = summary.lastMessage;
	if (!message) {
		return { text: summary.jid, typing: false };
	}

	const outgoing = message.direction === "outgoing";
	const attachment = message.attachments?.[0];
	return {
		text: message.body || (attachment ? `📎 ${attachment.name}` : summary.jid),
		prefix: outgoing ? "You:" : undefined,
		status: outgoing ? message.status : undefined,
		typing: false,
	};
}
