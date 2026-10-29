import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { ContactPicker } from "#/components/chat/groups/contact-picker/contact-picker";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";
import { displayJidName } from "#/lib/xmpp/jid";
import { isSelfJid } from "#/lib/xmpp/reducers";

export function CreateGroupDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const state = useXmppState();
	const actions = useXmppActions();
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [selected, setSelected] = useState<Set<string>>(() => new Set());
	const [submitting, setSubmitting] = useState(false);

	const contacts = useMemo(
		() =>
			Object.values(state.contacts)
				.filter((contact) => !isSelfJid(state, contact.jid))
				.map((contact) => ({
					...contact,
					name: displayJidName(contact.jid, contact.name),
				}))
				.sort((a, b) => a.name.localeCompare(b.name)),
		[state],
	);

	const groupName = name.trim();

	function toggle(jid: string, checked: boolean) {
		setSelected((current) => {
			const next = new Set(current);
			if (checked) next.add(jid);
			else next.delete(jid);
			return next;
		});
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!groupName) {
			toast.error("Enter a group name.");
			return;
		}
		if (selected.size === 0) {
			toast.error("Select at least one contact.");
			return;
		}

		setSubmitting(true);
		try {
			const room = await actions.createGroupChat(
				groupName,
				Array.from(selected),
			);
			toast.success(`Created ${room.name}`);
			onOpenChange(false);
			void navigate({
				to: "/chat/group/$room",
				params: { room: room.jid },
			});
		} catch {
			// The store surfaces the failure through the shared error toaster.
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>New group chat</DialogTitle>
					<DialogDescription>
						Creates a multi-user chat room and invites the selected contacts.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
					<Field>
						<FieldLabel htmlFor="group-name">Group name</FieldLabel>
						<Input
							id="group-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="Family, Work, Project…"
							autoComplete="off"
							disabled={submitting}
						/>
						<FieldDescription>
							The room is created on your server. Contacts receive an invite.
						</FieldDescription>
					</Field>

					<div className="space-y-2">
						<div className="flex items-center justify-between gap-2">
							<p className="text-sm font-medium">Contacts</p>
							<span className="text-xs text-muted-foreground">
								{selected.size} selected
							</span>
						</div>
						<ContactPicker
							contacts={contacts}
							selected={selected}
							onToggle={toggle}
							disabled={submitting}
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
							disabled={submitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={submitting || !groupName || selected.size === 0}
						>
							Create group chat
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
