import { RiAddLine } from "@remixicon/react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { useXmppActions } from "#/hooks/xmpp/use-xmpp";
import { isValidJid } from "#/lib/xmpp/jid";

export function AddContactDialog() {
	const actions = useXmppActions();
	const [open, setOpen] = useState(false);
	const [jid, setJid] = useState("");
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const value = jid.trim();
		if (!isValidJid(value)) {
			toast.error("Enter a valid JID, for example friend@example.com.");
			return;
		}
		setSubmitting(true);
		try {
			await actions.addContact(value);
			setJid("");
			setOpen(false);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button variant="secondary" size="icon" aria-label="Add contact" />
				}
			>
				<RiAddLine />
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add a contact</DialogTitle>
					<DialogDescription>
						Send a subscription request to an XMPP address.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<Field>
						<FieldLabel htmlFor="contact-jid">JID</FieldLabel>
						<Input
							id="contact-jid"
							value={jid}
							onChange={(event) => setJid(event.target.value)}
							placeholder="friend@example.com"
							autoComplete="off"
							disabled={submitting}
						/>
					</Field>
					<DialogFooter>
						<Button type="submit" disabled={submitting}>
							Send request
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
