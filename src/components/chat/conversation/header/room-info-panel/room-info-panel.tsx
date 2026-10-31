import {
	RiArrowLeftLine,
	RiArrowRightSLine,
	RiGroupLine,
	RiUserAddLine,
} from "@remixicon/react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { ContactInfoPanel } from "#/components/chat/conversation/header/contact-info-panel/contact-info-panel";
import { AddMembersDialog } from "#/components/chat/groups/add-members-dialog/add-members-dialog";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { CodeBlockCopyButton } from "#/components/ui/code-block";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";
import { presenceDotClassName } from "#/lib/format/presence";
import { cn } from "#/lib/utils";
import { presenceLabel } from "#/lib/xmpp/presence";
import { selectOpenInvites, selectRoomMembers } from "#/lib/xmpp/room-members";
import { useRightSidebar } from "#/providers/right-sidebar-provider";

export function RoomInfoPanel({ jid }: { jid: string }) {
	const state = useXmppState();
	const actions = useXmppActions();
	const navigate = useNavigate();
	const { close } = useRightSidebar();
	const room = state.rooms[jid];
	const hasRoom = Boolean(room);
	const inviteRequest = state.roomInviteRequests.find(
		(request) => request.roomJid === jid,
	);
	const [selectedJid, setSelectedJid] = useState<string | null>(null);
	const [addOpen, setAddOpen] = useState(false);
	const members = selectRoomMembers(room);
	const self = room ? room.occupants[room.nick] : undefined;
	const canInvite =
		self?.role === "moderator" ||
		self?.affiliation === "owner" ||
		self?.affiliation === "admin";
	const selfJid = state.account?.bareJid;
	const invites = selectOpenInvites(room)
		.filter((invite) => !invite.invitedBy || invite.invitedBy === selfJid)
		.sort((a, b) => b.invitedAt - a.invitedAt);

	useEffect(() => {
		if (!hasRoom || !canInvite) return;
		void actions.refreshRoomMembers(jid).catch(() => undefined);
	}, [actions, canInvite, hasRoom, jid]);

	if (!room && inviteRequest) {
		const request = inviteRequest;
		async function accept() {
			try {
				await actions.acceptRoomInvite(jid);
				toast.success(`Joined ${request.roomName}`);
			} catch {
				// The store surfaces the failure through the shared error toaster.
			}
		}

		async function decline() {
			await actions.declineRoomInvite(jid);
			close();
			void navigate({ to: "/chat" });
		}

		return (
			<div className="space-y-4">
				<div className="rounded-xl border border-border bg-card p-4">
					<div className="flex items-start gap-3">
						<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
							<RiGroupLine className="size-4" />
						</span>
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium">{request.roomName}</p>
							<p className="text-xs text-muted-foreground">
								Invited by {request.from}
							</p>
							{request.reason && (
								<p className="mt-1 text-xs text-muted-foreground">
									{request.reason}
								</p>
							)}
						</div>
					</div>
					<p className="mt-3 text-xs leading-relaxed text-muted-foreground">
						This is an invite-only preview. Join to read its history and send
						messages.
					</p>
					<div className="mt-3 flex gap-2">
						<Button size="sm" onClick={() => void accept()}>
							Join group
						</Button>
						<Button size="sm" variant="outline" onClick={() => void decline()}>
							Decline
						</Button>
					</div>
				</div>
			</div>
		);
	}

	if (selectedJid) {
		return (
			<div
				key={selectedJid}
				className="animate-in fade-in-0 slide-in-from-right-2 duration-200"
			>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="mb-3 gap-1.5 px-2 text-muted-foreground"
					onClick={() => setSelectedJid(null)}
				>
					<RiArrowLeftLine className="size-4" />
					Back to room
				</Button>
				<ContactInfoPanel jid={selectedJid} showOmemo={false} />
			</div>
		);
	}

	return (
		<div className="animate-in fade-in-0 slide-in-from-left-2 space-y-4 duration-200">
			<div className="flex flex-col items-center gap-3 rounded-xl border border-border/40 bg-muted/80 px-4 pb-5 pt-7 text-center">
				<span className="grid size-14 place-items-center rounded-full bg-background text-muted-foreground">
					<RiGroupLine className="size-6" />
				</span>
				<div className="min-w-0 space-y-1">
					<div className="flex justify-between gap-2">
						<h3 className="truncate flex-1 text-xl break-after-auto max-w-52 font-semibold">
							{room?.name ?? jid.split("@")[0]}
						</h3>

						<Tooltip>
							<TooltipTrigger
								render={
									<CodeBlockCopyButton
										variant="outline"
										value={room?.name ?? jid}
									/>
								}
							/>
							<TooltipContent>{room?.name ?? jid}</TooltipContent>
						</Tooltip>
					</div>

					<p className="text-sm text-muted-foreground">
						{members.length === 1 ? "1 member" : `${members.length} members`}
					</p>
					{room?.subject && (
						<p className="text-xs text-muted-foreground">{room.subject}</p>
					)}
				</div>
			</div>

			<div className="overflow-hidden rounded-xl border border-border bg-card">
				<div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
					<p className="text-xs font-medium text-muted-foreground">Members</p>
					{canInvite && (
						<Button
							type="button"
							variant="ghost"
							size="xs"
							className="gap-1 text-muted-foreground"
							disabled={!room}
							onClick={() => setAddOpen(true)}
						>
							<RiUserAddLine className="size-3.5" />
							Add members
						</Button>
					)}
				</div>
				{members.length === 0 ? (
					<p className="px-4 py-6 text-center text-sm text-muted-foreground">
						{room?.membership === "joining"
							? "Joining the room…"
							: "No members online."}
					</p>
				) : (
					<ul className="divide-y divide-border">
						{members.map((member) => {
							const realJid = member.jid;
							return (
								<li key={realJid ?? member.name}>
									<button
										type="button"
										disabled={!realJid}
										onClick={() => realJid && setSelectedJid(realJid)}
										aria-label={`View ${member.name}`}
										className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none disabled:cursor-default disabled:hover:bg-transparent"
									>
										<div className="relative shrink-0">
											<UserAvatar
												jid={realJid ?? member.name}
												name={member.name}
												size="sm"
											/>
											{member.online && member.presence && (
												<span
													className={cn(
														"absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card",
														presenceDotClassName(member.presence.show),
													)}
												/>
											)}
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium">
												{member.name}
											</p>
											<p className="truncate text-xs text-muted-foreground">
												{member.online && member.presence
													? (realJid ?? presenceLabel(member.presence))
													: (realJid ?? "Offline")}
											</p>
										</div>
										<div className="flex shrink-0 items-center gap-1.5">
											{(member.role || member.affiliation) && (
												<Badge variant="outline">
													{member.role ?? member.affiliation}
												</Badge>
											)}
											{realJid && (
												<RiArrowRightSLine className="size-4 text-muted-foreground" />
											)}
										</div>
									</button>
								</li>
							);
						})}
					</ul>
				)}
			</div>

			{invites.length > 0 && (
				<div className="overflow-hidden rounded-xl border border-border bg-card">
					<div className="border-b border-border px-4 py-2.5">
						<p className="text-xs font-medium text-muted-foreground">Invites</p>
					</div>
					<ul className="divide-y divide-border">
						{invites.map((invite) => (
							<li
								key={invite.jid}
								className="flex items-center gap-3 px-4 py-3"
							>
								<UserAvatar jid={invite.jid} name={invite.name} size="sm" />
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium">
										{invite.name ?? invite.jid}
									</p>
									<p className="truncate text-xs text-muted-foreground">
										{invite.jid}
									</p>
								</div>
								<Badge
									variant={
										invite.status === "pending" ? "secondary" : "destructive"
									}
								>
									{invite.status === "pending" ? "Invited" : "Declined"}
								</Badge>
							</li>
						))}
					</ul>
				</div>
			)}

			<AddMembersDialog
				key={addOpen ? "open" : "closed"}
				jid={jid}
				open={addOpen}
				onOpenChange={setAddOpen}
			/>
		</div>
	);
}
