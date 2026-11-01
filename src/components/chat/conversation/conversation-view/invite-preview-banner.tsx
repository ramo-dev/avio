import type { RoomPreviewStatus } from "#/components/chat/conversation/conversation-view/use-room-invite-preview";
import { Button } from "#/components/ui/button";
import { bareJid } from "#/lib/xmpp/jid";
import type { RoomInviteRequest } from "#/types/chat";

/** Read-only room preview shown before the user joins from an invite. */
export function InvitePreviewBanner({
	invite,
	status,
	hasMessages,
	onAccept,
	onDecline,
}: {
	invite: RoomInviteRequest;
	status: RoomPreviewStatus;
	hasMessages: boolean;
	onAccept: () => void;
	onDecline: () => void;
}) {
	return (
		<div className="shrink-0 border-b border-border bg-muted/30 px-4 py-3">
			<p className="text-sm font-medium">{invite.roomName}</p>
			<p className="mt-0.5 text-xs text-muted-foreground">
				Invited by {bareJid(invite.from)}
				{invite.reason ? ` · ${invite.reason}` : ""}
			</p>
			<p className="mt-2 text-xs leading-relaxed text-muted-foreground">
				{status === "loading"
					? "Loading a read-only preview…"
					: status === "restricted"
						? "This private group hides its history until you join."
						: status === "ok" && hasMessages
							? "Read-only preview. Join to participate."
							: "Join this group to see its messages and send replies."}
			</p>
			<div className="mt-3 flex gap-2">
				<Button size="sm" onClick={onAccept}>
					Join group
				</Button>
				<Button size="sm" variant="outline" onClick={onDecline}>
					Decline
				</Button>
			</div>
		</div>
	);
}
