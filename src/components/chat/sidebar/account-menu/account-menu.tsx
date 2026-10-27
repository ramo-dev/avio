import { RiLogoutBoxRLine } from "@remixicon/react";
import { ConnectionBadge } from "#/components/common/connection-badge/connection-badge";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";
import { displayJidName } from "#/lib/xmpp/jid";

export function AccountMenu() {
	const state = useXmppState();
	const actions = useXmppActions();
	const jid = state.account?.bareJid ?? state.connection.jid ?? "";
	const name = displayJidName(jid);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon-sm"
						className="rounded-full"
						aria-label="Account menu"
					/>
				}
			>
				<UserAvatar jid={jid} name={name} size="sm" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-60">
				<DropdownMenuLabel className="flex flex-col gap-1">
					<span className="font-medium text-foreground">{name}</span>
					<span className="truncate text-xs font-normal text-muted-foreground">
						{jid}
					</span>
					<ConnectionBadge status={state.connection.status} className="mt-1" />
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => void actions.disconnect()}>
					<RiLogoutBoxRLine />
					Disconnect
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
