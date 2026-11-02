import { RiNotification3Line } from "@remixicon/react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { NotificationPanel } from "#/components/chat/list/notification-menu/notification-panel/notification-panel";
import { Button } from "#/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import { useNotifications } from "#/hooks/use-notifications";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";
import {
	clearNotifications,
	markAllNotificationsRead,
	markNotificationRead,
} from "#/lib/notifications/store";
import type { NotificationTab, StoredNotification } from "#/types/notification";

export function NotificationMenu() {
	const state = useXmppState();
	const actions = useXmppActions();
	const navigate = useNavigate();
	const accountJid = state.account?.bareJid ?? null;
	const notifications = useNotifications(accountJid);
	const [open, setOpen] = useState(false);
	const [tab, setTab] = useState<NotificationTab>("all");
	const items = useMemo(
		() => [...notifications].sort((a, b) => b.timestamp - a.timestamp),
		[notifications],
	);
	const unread = items.filter((item) => !item.read).length;

	function openNotification(item: StoredNotification) {
		markNotificationRead(accountJid, item.id);
		setOpen(false);
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
		setOpen(false);
		try {
			await actions.acceptRoomInvite(item.jid);
			void navigate({ to: "/chat/group/$room", params: { room: item.jid } });
		} catch {
			// The store surfaces the failure through the shared error toaster.
		}
	}

	function declineInvite(item: StoredNotification) {
		markNotificationRead(accountJid, item.id);
		setOpen(false);
		void actions.declineRoomInvite(item.jid);
	}

	function markAllRead() {
		markAllNotificationsRead(accountJid);
		actions.markAllRead();
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
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
						<span className="absolute -top-3.5 -right-2.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-4 text-primary-foreground">
							{unread > 9 ? "9+" : unread}
						</span>
					)}
				</span>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				sideOffset={8}
				className="w-[430px] max-w-[calc(100vw-24px)] gap-0 overflow-hidden rounded-2xl p-0"
			>
				<NotificationPanel
					items={items}
					unread={unread}
					tab={tab}
					onTabChange={setTab}
					onOpen={openNotification}
					onAccept={(item) => void acceptInvite(item)}
					onDecline={declineInvite}
					onMarkAllRead={markAllRead}
					onClear={() => clearNotifications(accountJid)}
				/>
			</PopoverContent>
		</Popover>
	);
}
