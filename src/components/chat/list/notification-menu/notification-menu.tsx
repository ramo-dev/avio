import { RiGroupLine, RiNotification3Line } from "@remixicon/react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useNotifications } from "#/hooks/use-notifications";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";
import { formatRelativeTime } from "#/lib/format/time";
import {
	clearNotifications,
	markAllNotificationsRead,
	markNotificationRead,
} from "#/lib/notifications/store";
import type { StoredNotification } from "#/types/notification";

export function NotificationMenu() {
	const state = useXmppState();
	const actions = useXmppActions();
	const navigate = useNavigate();
	const accountJid = state.account?.bareJid ?? null;
	const notifications = useNotifications(accountJid);
	const items = useMemo(
		() => [...notifications].sort((a, b) => b.timestamp - a.timestamp),
		[notifications],
	);
	const unread = items.filter((item) => !item.read).length;

	function open(item: StoredNotification) {
		markNotificationRead(accountJid, item.id);
		actions.setActiveConversation(item.jid);
		if (item.kind === "group" && state.rooms[item.jid]) {
			void navigate({ to: "/chat/group/$room", params: { room: item.jid } });
			return;
		}
		if (item.kind === "direct") {
			void navigate({ to: "/chat/$jid", params: { jid: item.jid } });
			return;
		}
		void navigate({ to: "/chat" });
	}

	async function acceptInvite(item: StoredNotification) {
		markNotificationRead(accountJid, item.id);
		try {
			await actions.acceptRoomInvite(item.jid);
			void navigate({ to: "/chat/group/$room", params: { room: item.jid } });
		} catch {
			// The store surfaces the failure through the shared error toaster.
		}
	}

	function declineInvite(item: StoredNotification) {
		markNotificationRead(accountJid, item.id);
		void actions.declineRoomInvite(item.jid);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="secondary"
						size="icon"
						aria-label={
							unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
						}
					/>
				}
			>
				<span className="relative inline-flex">
					<RiNotification3Line />
					{unread > 0 && (
						<span className="absolute -right-2.5 -top-3.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-4 text-primary-foreground">
							{unread > 9 ? "9+" : unread}
						</span>
					)}
				</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-80">
				<DropdownMenuGroup>
					<DropdownMenuLabel className="flex items-center justify-between gap-2">
						<span>Notifications</span>
						{unread > 0 && (
							<Badge variant="secondary">{unread > 99 ? "99+" : unread}</Badge>
						)}
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{items.length === 0 ? (
						<div className="px-2 py-6 text-center text-xs text-muted-foreground">
							You&apos;re all caught up.
						</div>
					) : (
						items.slice(0, 10).map((item) =>
							item.invite ? (
								<div key={item.id} className="px-2 py-2">
									<div className="flex items-start gap-2">
										<span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
											<RiGroupLine className="size-4" />
										</span>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm font-medium">
												{item.name}
											</span>
											<span className="block text-xs text-muted-foreground">
												{item.body}
											</span>
										</span>
									</div>
									<div className="mt-2 flex gap-2 pl-11">
										<Button
											size="xs"
											variant="ghost"
											onClick={() => {
												markNotificationRead(accountJid, item.id);
												void navigate({
													to: "/chat/group/$room",
													params: { room: item.jid },
												});
											}}
										>
											Preview
										</Button>
										<Button size="xs" onClick={() => void acceptInvite(item)}>
											Accept
										</Button>
										<Button
											size="xs"
											variant="ghost"
											onClick={() => declineInvite(item)}
										>
											Decline
										</Button>
									</div>
								</div>
							) : (
								<DropdownMenuItem
									key={item.id}
									onClick={() => open(item)}
									className="items-start gap-2 py-2"
								>
									{item.kind === "group" ? (
										<span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
											<RiGroupLine className="size-4" />
										</span>
									) : (
										<UserAvatar
											jid={item.jid}
											name={item.name}
											size="sm"
											className="size-9"
										/>
									)}
									<span className="min-w-0 flex-1">
										<span className="flex items-center justify-between gap-2">
											<span className="truncate text-sm font-medium">
												{item.name}
											</span>
											<span className="shrink-0 text-[0.65rem] text-muted-foreground">
												{formatRelativeTime(item.timestamp)}
											</span>
										</span>
										<span className="line-clamp-1 block text-xs text-muted-foreground">
											{item.body}
										</span>
									</span>
									{!item.read && (
										<span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
									)}
								</DropdownMenuItem>
							),
						)
					)}
					{items.length > 0 && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => {
									markAllNotificationsRead(accountJid);
									actions.markAllRead();
								}}
							>
								Mark all read
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => clearNotifications(accountJid)}>
								Clear notifications
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
