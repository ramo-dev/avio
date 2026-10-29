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
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";
import { displayJidName } from "#/lib/xmpp/jid";
import { isSelfJid } from "#/lib/xmpp/reducers";

export function AddMembersDialog({
	jid,
	open,
	onOpenChange,
}: {
	jid: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const state = useXmppState();
	const actions = useXmppActions();
	const room = state.rooms[jid];
	const [selected, setSelected] = useState<Set<string>>(() => new Set());
	const [submitting, setSubmitting] = useState(false);

	const contacts = useMemo(() => {
		const occupants = new Set(
			Object.values(room?.occupants ?? {})
				.map((occupant) => occupant.jid?.toLowerCase())
				.filter((value): value is string => Boolean(value)),
		);

		return Object.values(state.contacts)
			.filter(
				(contact) =>
					!isSelfJid(state, contact.jid) &&
					!occupants.has(contact.jid.toLowerCase()),
			)
			.map((contact) => ({
				jid: contact.jid,
				name: displayJidName(contact.jid, contact.name),
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [room, state]);

	function toggle(contactJid: string, checked: boolean) {
		setSelected((current) => {
			const next = new Set(current);
			if (checked) next.add(contactJid);
			else next.delete(contactJid);
			return next;
		});
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (selected.size === 0) {
			toast.error("Select at least one contact.");
			return;
		}

		setSubmitting(true);
		try {
			await actions.addGroupMembers(jid, Array.from(selected));
			toast.success(
				selected.size === 1 ? "Invite sent" : `${selected.size} invites sent`,
			);
			onOpenChange(false);
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
					<DialogTitle>Add members</DialogTitle>
					<DialogDescription>
						Invite contacts to {room?.name ?? "this group chat"}.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
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
						disabled={submitting || !room}
						emptyLabel="Everyone in your roster is already here."
					/>

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
							disabled={submitting || !room || selected.size === 0}
						>
							Send invites
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
