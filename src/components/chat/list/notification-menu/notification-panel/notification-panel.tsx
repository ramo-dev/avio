import { RiNotificationOffLine } from "@remixicon/react";
import { useMemo } from "react";
import { NotificationItem } from "#/components/chat/list/notification-menu/notification-item/notification-item";
import { Button } from "#/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import type { NotificationTab, StoredNotification } from "#/types/notification";

const TABS: Array<{ id: NotificationTab; label: string }> = [
	{ id: "all", label: "All" },
	{ id: "direct", label: "Chats" },
	{ id: "group", label: "Rooms" },
];

export function NotificationPanel({
	items,
	unread,
	tab,
	onTabChange,
	onOpen,
	onAccept,
	onDecline,
	onMarkAllRead,
	onClear,
}: {
	items: StoredNotification[];
	unread: number;
	tab: NotificationTab;
	onTabChange: (tab: NotificationTab) => void;
	onOpen: (item: StoredNotification) => void;
	onAccept: (item: StoredNotification) => void;
	onDecline: (item: StoredNotification) => void;
	onMarkAllRead: () => void;
	onClear: () => void;
}) {
	const counts = useMemo(
		() => ({
			all: items.length,
			direct: items.filter((item) => item.kind === "direct").length,
			group: items.filter((item) => item.kind === "group").length,
		}),
		[items],
	);
	const visible = useMemo(
		() => (tab === "all" ? items : items.filter((item) => item.kind === tab)),
		[items, tab],
	);

	return (
		<div className="flex max-h-[min(70vh,560px)] w-full flex-col">
			<div className="flex flex-col gap-3 p-4 pb-2">
				<div className="flex items-start justify-between gap-4">
					<div className="flex min-w-0 flex-col gap-0.5">
						<h2 className="text-base font-semibold">Notifications</h2>
						<p className="text-xs text-muted-foreground">
							{unread === 0 ? "No unread notifications" : `${unread} unread`}
						</p>
					</div>
					<Button
						variant="ghost"
						size="xs"
						onClick={onMarkAllRead}
						disabled={unread === 0}
					>
						Mark all read
					</Button>
				</div>

				<ToggleGroup
					variant="outline"
					spacing={0}
					aria-label="Notification category"
					className="w-full"
					value={[tab]}
					onValueChange={(value) => {
						const next = value.at(-1) as NotificationTab | undefined;
						if (next) onTabChange(next);
					}}
				>
					{TABS.map(({ id, label }) => (
						<ToggleGroupItem
							key={id}
							value={id}
							className="flex-1 gap-1.5 px-2 text-xs"
						>
							{label}
							<span className="inline-flex min-w-4 items-center justify-center rounded-sm bg-muted px-1 py-px text-[0.6rem] font-medium text-muted-foreground">
								{counts[id]}
							</span>
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-2">
				{visible.length === 0 ? (
					<div className="flex min-h-52 flex-col items-center justify-center gap-2 px-6 text-center">
						<span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
							<RiNotificationOffLine className="size-5" />
						</span>
						<p className="text-sm font-medium">You&apos;re all caught up.</p>
						<p className="max-w-64 text-xs text-muted-foreground">
							New activity will appear here when it arrives.
						</p>
					</div>
				) : (
					<div className="flex flex-col gap-2">
						{visible.map((item) => (
							<NotificationItem
								key={item.id}
								item={item}
								onOpen={() => onOpen(item)}
								onAccept={() => onAccept(item)}
								onDecline={() => onDecline(item)}
							/>
						))}
					</div>
				)}
			</div>

			{items.length > 0 && (
				<div className="flex items-center justify-between border-t border-border px-3 py-2">
					<span className="text-xs text-muted-foreground">
						{items.length} notification{items.length === 1 ? "" : "s"}
					</span>
					<Button variant="ghost" size="xs" onClick={onClear}>
						Clear all
					</Button>
				</div>
			)}
		</div>
	);
}
