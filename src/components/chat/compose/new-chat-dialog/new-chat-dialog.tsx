import { RiEditBoxLine } from "@remixicon/react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { Button } from "#/components/ui/button";
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "#/components/ui/command";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";
import { displayJidName } from "#/lib/xmpp/jid";
import { isSelfJid } from "#/lib/xmpp/reducers";

export function NewChatDialog() {
	const state = useXmppState();
	const actions = useXmppActions();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);

	useEffect(() => {
		function handleShortcut(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
				event.preventDefault();
				setOpen(true);
			}
		}
		window.addEventListener("keydown", handleShortcut);
		return () => window.removeEventListener("keydown", handleShortcut);
	}, []);

	const contacts = useMemo(() => {
		return Object.values(state.contacts)
			.filter((contact) => !isSelfJid(state, contact.jid))
			.map((contact) => ({
				jid: contact.jid,
				name: displayJidName(contact.jid, contact.name),
				lastActivity: state.conversations[contact.jid]?.lastActivity ?? 0,
			}))
			.sort((a, b) => {
				if (a.lastActivity !== b.lastActivity) {
					return b.lastActivity - a.lastActivity;
				}
				return a.name.localeCompare(b.name);
			});
	}, [state]);

	function choose(jid: string) {
		actions.ensureConversation(jid);
		setOpen(false);
		void navigate({ to: "/chat/$jid", params: { jid } });
	}

	return (
		<>
			<Button
				variant="secondary"
				size="icon"
				aria-label="New chat"
				title="New chat (⌘N)"
				onClick={() => setOpen(true)}
			>
				<RiEditBoxLine />
			</Button>

			<CommandDialog
				open={open}
				onOpenChange={setOpen}
				title="New chat"
				description="Search contacts and start a conversation"
			>
				<Command>
					<CommandInput placeholder="Search people…" />
					<CommandList>
						<CommandEmpty>No contacts found.</CommandEmpty>
						<CommandGroup heading="Contacts">
							{contacts.map((contact) => (
								<CommandItem
									key={contact.jid}
									value={`${contact.name} ${contact.jid}`}
									onSelect={() => choose(contact.jid)}
								>
									<UserAvatar jid={contact.jid} name={contact.name} size="sm" />
									<span className="truncate">{contact.name}</span>
									<span className="ml-auto max-w-40 truncate text-xs text-muted-foreground">
										{contact.jid}
									</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</CommandDialog>
		</>
	);
}
