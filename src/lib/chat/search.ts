import { groupMessages } from "#/lib/xmpp/messages";
import type { ChatMessage } from "#/types/chat";

export interface MessageMatch {
	messageId: string;
	groupId: string;
	message: ChatMessage;
}

export function findMessageMatches(
	messages: ChatMessage[],
	query: string,
): MessageMatch[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) return [];

	const matches: MessageMatch[] = [];
	for (const group of groupMessages(messages)) {
		for (const message of group.messages) {
			if (message.body.toLowerCase().includes(normalized)) {
				matches.push({
					messageId: message.id,
					groupId: group.id,
					message,
				});
			}
		}
	}
	return matches;
}
