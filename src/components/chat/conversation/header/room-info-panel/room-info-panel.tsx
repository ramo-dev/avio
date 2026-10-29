import {
	RiArrowLeftLine,
	RiArrowRightSLine,
	RiGroupLine,
	RiUserAddLine,
} from "@remixicon/react";
import { useState } from "react";
import { ContactInfoPanel } from "#/components/chat/conversation/header/contact-info-panel/contact-info-panel";
import { AddMembersDialog } from "#/components/chat/groups/add-members-dialog/add-members-dialog";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { useXmppState } from "#/hooks/xmpp/use-xmpp";
import { presenceDotClassName } from "#/lib/format/presence";
import { cn } from "#/lib/utils";
import { presenceLabel } from "#/lib/xmpp/presence";

export function RoomInfoPanel({ jid }: { jid: string }) {
	const state = useXmppState();
	const room = state.rooms[jid];
	const [selectedJid, setSelectedJid] = useState<string | null>(null);
	const [addOpen, setAddOpen] = useState(false);
	const occupants = Object.values(room?.occupants ?? {});
	const self = room ? room.occupants[room.nick] : undefined;
	const canInvite =
		self?.role === "moderator" ||
		self?.affiliation === "owner" ||
		self?.affiliation === "admin";
	const invites = Object.values(room?.invites ?? {}).sort((a, b) => {
		if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
		return b.invitedAt - a.invitedAt;
	});

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
				<ContactInfoPanel jid={selectedJid} />
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
					<h3 className="truncate text-xl font-semibold">
						{room?.name ?? jid.split("@")[0]}
					</h3>
					<p className="text-sm text-muted-foreground">
						{occupants.length === 1
							? "1 member"
							: `${occupants.length} members`}
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
				{occupants.length === 0 ? (
					<p className="px-4 py-6 text-center text-sm text-muted-foreground">
						Joining the room…
					</p>
				) : (
					<ul className="divide-y divide-border">
						{occupants.map((occupant) => {
							const realJid = occupant.jid;
							return (
								<li key={occupant.nick}>
									<button
										type="button"
										disabled={!realJid}
										onClick={() => realJid && setSelectedJid(realJid)}
										aria-label={`View ${occupant.nick}`}
										className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none disabled:cursor-default disabled:hover:bg-transparent"
									>
										<div className="relative shrink-0">
											<UserAvatar
												jid={realJid ?? occupant.nick}
												name={occupant.nick}
												size="sm"
											/>
											<span
												className={cn(
													"absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card",
													presenceDotClassName(occupant.presence.show),
												)}
											/>
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium">
												{occupant.nick}
											</p>
											<p className="truncate text-xs text-muted-foreground">
												{realJid ?? presenceLabel(occupant.presence)}
											</p>
										</div>
										<div className="flex shrink-0 items-center gap-1.5">
											{(occupant.role || occupant.affiliation) && (
												<Badge variant="outline">
													{occupant.role ?? occupant.affiliation}
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
										invite.status === "pending" ? "secondary" : "default"
									}
								>
									{invite.status === "pending" ? "Pending" : "Accepted"}
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
