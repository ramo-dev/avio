import { RiGroupLine } from "@remixicon/react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "react-hot-toast";
import { Button } from "#/components/ui/button";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";

export function RoomInviteRequests() {
	const state = useXmppState();
	const actions = useXmppActions();
	const navigate = useNavigate();

	if (state.roomInviteRequests.length === 0) return null;

	async function accept(roomJid: string, roomName: string) {
		try {
			await actions.acceptRoomInvite(roomJid);
			toast.success(`Joined ${roomName}`);
			void navigate({ to: "/chat/group/$room", params: { room: roomJid } });
		} catch {
			// The store surfaces the failure through the shared error toaster.
		}
	}

	return (
		<div className="mx-3 mb-2 rounded-lg border border-border bg-muted/40 p-2">
			<p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
				<RiGroupLine className="size-3.5" />
				Group invites
			</p>
			<ul className="flex flex-col gap-2">
				{state.roomInviteRequests.map((request) => (
					<li key={request.roomJid} className="flex items-center gap-2">
						<span className="grid size-8 shrink-0 place-items-center rounded-full bg-background text-muted-foreground">
							<RiGroupLine className="size-4" />
						</span>
						<span className="min-w-0 flex-1">
							<span className="block truncate text-xs font-medium">
								{request.roomName}
							</span>
							<span className="block truncate text-[0.7rem] text-muted-foreground">
								{request.from}
							</span>
						</span>
						<Button
							size="xs"
							variant="ghost"
							onClick={() =>
								void navigate({
									to: "/chat/group/$room",
									params: { room: request.roomJid },
								})
							}
						>
							Preview
						</Button>
						<Button
							size="xs"
							variant="secondary"
							onClick={() => void accept(request.roomJid, request.roomName)}
						>
							Accept
						</Button>
						<Button
							size="xs"
							variant="ghost"
							onClick={() => void actions.declineRoomInvite(request.roomJid)}
						>
							Decline
						</Button>
					</li>
				))}
			</ul>
		</div>
	);
}
