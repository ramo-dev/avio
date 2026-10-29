import { RiSearchLine, RiShareForward2Line } from "@remixicon/react";
import { useMemo, useState } from "react";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { Button } from "#/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "#/components/ui/drawer";
import { Input } from "#/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import { useMediaQuery } from "#/hooks/use-media-query";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";
import { cn } from "#/lib/utils";
import { selectConversationSummaries } from "#/lib/xmpp/selectors";
import type { ChatMessage } from "#/types/chat";

const triggerClassName =
	"size-7 rounded-full text-muted-foreground hover:bg-muted";

export function MessageForwardAction({
	message,
	onForwarded,
	open: controlledOpen,
	onOpenChange,
}: {
	message: ChatMessage;
	onForwarded?: () => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const state = useXmppState();
	const actions = useXmppActions();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [internalOpen, setInternalOpen] = useState(false);
	const open = controlledOpen ?? internalOpen;
	const setOpen = onOpenChange ?? setInternalOpen;
	const [query, setQuery] = useState("");

	const recipients = useMemo(() => {
		const account = state.account?.bareJid;
		const summaries = selectConversationSummaries(state).filter(
			(summary) => summary.jid !== account,
		);
		const current = summaries.find(
			(summary) => summary.jid === message.conversationJid,
		);
		if (!current) return summaries;
		return [
			current,
			...summaries.filter((summary) => summary.jid !== current.jid),
		];
	}, [state, message.conversationJid]);

	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return recipients;
		return recipients.filter(
			(recipient) =>
				recipient.name.toLowerCase().includes(needle) ||
				recipient.jid.toLowerCase().includes(needle),
		);
	}, [query, recipients]);

	function selectRecipient(jid: string) {
		setOpen(false);
		setQuery("");
		onForwarded?.();
		void actions.forwardMessage(jid, message);
	}

	const trigger = (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			aria-label="Forward message"
			title="Forward message"
			className={triggerClassName}
		>
			<RiShareForward2Line className="size-3.5" />
		</Button>
	);

	const picker = (
		<>
			<div className="px-3 py-2">
				<div className="relative">
					<RiSearchLine className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search contacts"
						aria-label="Search recipients"
						className="h-9 pl-8"
					/>
				</div>
			</div>
			<RecipientList
				recipients={filtered}
				onSelect={selectRecipient}
				className="max-h-72 overflow-y-auto p-2 pt-0"
			/>
		</>
	);

	const header = (
		<>
			<div className="font-medium">Forward message</div>
			<div className="text-xs text-muted-foreground">
				Send this message to another conversation.
			</div>
		</>
	);

	if (isDesktop) {
		return (
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger render={trigger} />
				<PopoverContent
					side="top"
					align="end"
					className="w-80 gap-0 overflow-hidden p-0"
				>
					<div className="px-3 pt-3">{header}</div>
					{picker}
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				aria-label="Forward message"
				title="Forward message"
				className={triggerClassName}
				onClick={() => setOpen(true)}
			>
				<RiShareForward2Line className="size-3.5" />
			</Button>
			<Drawer
				open={open}
				onOpenChange={setOpen}
				swipeDirection="down"
				showSwipeHandle
			>
				<DrawerContent className="[--drawer-height:70dvh]">
					<DrawerHeader>
						<DrawerTitle>Forward message</DrawerTitle>
						<DrawerDescription>
							Send this message to another conversation.
						</DrawerDescription>
					</DrawerHeader>
					<div className="flex min-h-0 flex-1 flex-col">{picker}</div>
				</DrawerContent>
			</Drawer>
		</>
	);
}

function RecipientList({
	recipients,
	onSelect,
	className,
}: {
	recipients: ReturnType<typeof selectConversationSummaries>;
	onSelect: (jid: string) => void;
	className?: string;
}) {
	if (recipients.length === 0) {
		return (
			<p className="px-3 py-6 text-center text-sm text-muted-foreground">
				No contacts to forward to.
			</p>
		);
	}

	return (
		<div className={cn("min-h-0", className)}>
			{recipients.map((recipient) => (
				<button
					key={recipient.jid}
					type="button"
					onClick={() => onSelect(recipient.jid)}
					className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
				>
					<UserAvatar
						jid={recipient.jid}
						name={recipient.name}
						size="sm"
						className="shrink-0"
					/>
					<span className="min-w-0">
						<span className="block truncate text-sm font-medium">
							{recipient.name}
						</span>
						<span className="block truncate text-xs text-muted-foreground">
							{recipient.jid}
						</span>
					</span>
				</button>
			))}
		</div>
	);
}
