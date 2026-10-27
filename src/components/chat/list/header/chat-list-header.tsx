import { RiCheckDoubleLine, RiMore2Line } from "@remixicon/react";
import { AccountMenu } from "#/components/chat/common/account-menu/account-menu";
import { NewChatDialog } from "#/components/chat/compose/new-chat-dialog/new-chat-dialog";
import { AddContactDialog } from "#/components/chat/contacts/add-contact-dialog/add-contact-dialog";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useXmppActions } from "#/hooks/xmpp/use-xmpp";

export function ChatListHeader({ count }: { count: number }) {
	const actions = useXmppActions();

	return (
		<header className="flex h-16 shrink-0 items-center gap-0.5 border-b border-border px-2.5">
			<div className="min-w-0 flex-1">
				<h1 className="truncate text-lg font-semibold tracking-tight">
					Messages
				</h1>
				<p className="text-xs text-muted-foreground">
					{count === 1 ? "1 chat" : `${count} chats`}
				</p>
			</div>
			<div className="md:hidden">
				<AccountMenu />
			</div>
			<NewChatDialog />
			<AddContactDialog />
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="secondary"
							size="icon"
							aria-label="Chat list actions"
						/>
					}
				>
					<RiMore2Line />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="md:min-w-34">
					<DropdownMenuItem onClick={actions.markAllRead}>
						<RiCheckDoubleLine />
						Mark all read
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</header>
	);
}
