import type { ConversationKind } from "#/types/chat";

export type NotificationTab = "all" | "direct" | "group";

export interface StoredNotification {
	id: string;
	jid: string;
	kind: ConversationKind;
	name: string;
	body: string;
	timestamp: number;
	read: boolean;
	invite?: boolean;
}
