import { groupMessages } from "#/lib/xmpp/messages";
import type { ChatMessage, TimelineItem } from "#/types/chat";

export function buildTimeline(messages: ChatMessage[]): TimelineItem[] {
	const items: TimelineItem[] = [];
	let lastDay = "";

	for (const group of groupMessages(messages)) {
		const date = new Date(group.timestamp);
		const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
		if (dayKey !== lastDay) {
			lastDay = dayKey;
			items.push({
				kind: "day",
				id: `day-${dayKey}`,
				timestamp: group.timestamp,
			});
		}
		items.push({ kind: "group", id: group.id, group });
	}

	return items;
}
