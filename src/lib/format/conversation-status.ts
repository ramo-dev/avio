import { formatLastSeen } from "#/lib/format/time";
import { presenceLabel } from "#/lib/xmpp/presence";
import type { ConversationKind } from "#/types/chat";
import type { PresenceState } from "#/types/xmpp";

interface ConversationStatusInput {
	kind: ConversationKind;
	memberPreview?: boolean;
	memberCount?: number;
	typing: boolean;
	presence: PresenceState;
}

/** Header subtitle for a direct conversation or group. */
export function conversationStatus({
	kind,
	memberPreview,
	memberCount,
	typing,
	presence,
}: ConversationStatusInput): string {
	if (kind === "group") {
		if (memberPreview) return "Invite-only group";
		if (memberCount === 1) return "1 member";
		return `${memberCount ?? 0} members`;
	}
	if (typing) return "typing…";
	if (presence.show === "offline" && presence.lastSeen) {
		return formatLastSeen(presence.lastSeen);
	}
	return presence.status || presenceLabel(presence);
}
