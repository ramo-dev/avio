import { RiCheckLine, RiCloseLine, RiSearchLine } from "@remixicon/react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Logo } from "#/assets/logo/Logo";
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
import { cn } from "#/lib/utils";
import {
	type CreateGroupDialogProps,
	filterContacts,
	groupContacts,
	initials,
	setVisibleSelection,
	toggleSelection,
} from "./create-group-helpers";

export function CreateGroupDialog({
	open,
	onOpenChange,
}: CreateGroupDialogProps) {
	const state = useXmppState();
	const actions = useXmppActions();
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState<Set<string>>(() => new Set());
	const [submitting, setSubmitting] = useState(false);

	const contacts = useMemo(() => groupContacts(state), [state]);
	const visibleContacts = useMemo(
		() => filterContacts(contacts, query),
		[contacts, query],
	);

	const selectedContacts = useMemo(
		() => contacts.filter((c) => selected.has(c.jid)),
		[contacts, selected],
	);

	const groupName = name.trim();
	const allVisibleSelected =
		visibleContacts.length > 0 &&
		visibleContacts.every((c) => selected.has(c.jid));
	const canSubmit = !submitting && groupName.length > 0 && selected.size > 0;
	function toggle(jid: string) {
		setSelected((current) => toggleSelection(current, jid));
	}

	function setVisible(checked: boolean) {
		setSelected((current) =>
			setVisibleSelection(
				current,
				visibleContacts.map((contact) => contact.jid),
				checked,
			),
		);
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
			<DialogContent className="flex max-h-[90vh] md:min-h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
				<DialogHeader className="border-b border-border px-3 py-3">
					<DialogTitle className="text-lg">New group chat</DialogTitle>
					<DialogDescription>
						Create a multi-user room and invite the contacts you choose.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
						{/* Left: group details */}
						<aside className="flex flex-col gap-6 border-b border-border bg-muted/40 p-6 md:border-r md:border-b-0">
							<div className="flex items-center gap-4">
								<div className="p-2 border rounded-xl">
									<Logo className="size-6" aria-hidden />
								</div>
								<div className="min-w-0">
									<p className="truncate text-base font-semibold text-foreground">
										{groupName || "Untitled group"}
									</p>
									<p className="text-xs text-muted-foreground">
										{selected.size} {selected.size === 1 ? "member" : "members"}{" "}
										invited
									</p>
								</div>
							</div>

							<Field>
								<FieldLabel htmlFor="group-name">Group name</FieldLabel>
								<Input
									id="group-name"
									value={name}
									onChange={(event) => setName(event.target.value)}
									placeholder="Family, Work, Project…"
									autoComplete="off"
									disabled={submitting}
									className="bg-background"
								/>
								<FieldDescription>
									The room is created on your server. Contacts receive an
									invite.
								</FieldDescription>
							</Field>

							<div className="flex min-h-0 flex-col gap-3">
								<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Members
								</p>
								{selectedContacts.length === 0 ? (
									<p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
										No one selected yet
									</p>
								) : (
									<ul className="flex flex-wrap gap-2 overflow-y-auto">
										{selectedContacts.map((contact) => (
											<li
												key={contact.jid}
												className="flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pr-1 pl-1.5 text-sm text-foreground"
											>
												<span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
													{initials(contact.name)}
												</span>
												<span className="max-w-[9rem] truncate">
													{contact.name}
												</span>
												<button
													type="button"
													onClick={() => toggle(contact.jid)}
													disabled={submitting}
													aria-label={`Remove ${contact.name}`}
													className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
												>
													<RiCloseLine className="size-3.5" aria-hidden />
												</button>
											</li>
										))}
									</ul>
								)}
							</div>
						</aside>

						{/* Right: contact browser */}
						<section className="flex min-h-0 flex-col">
							<div className="flex items-center gap-2 border-b border-border p-4">
								<div className="relative flex-1">
									<RiSearchLine
										className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
										aria-hidden
									/>
									<Input
										type="search"
										placeholder="Search contacts"
										value={query}
										onChange={(event) => setQuery(event.target.value)}
										onKeyDown={(event) => {
											if (event.key === "Enter") event.preventDefault();
										}}
										disabled={submitting}
										className="pl-9 h-10"
									/>
								</div>
								<Button
									type="button"
									variant="outline"
									onClick={() => setVisible(!allVisibleSelected)}
									disabled={submitting || visibleContacts.length === 0}
								>
									{allVisibleSelected ? "Clear" : "Select all"}
								</Button>
							</div>

							<ul className="min-h-0 flex-1 overflow-y-auto p-2">
								{visibleContacts.length === 0 ? (
									<li className="px-3 py-12 text-center text-sm text-muted-foreground">
										{contacts.length === 0
											? "No contacts yet."
											: "No matching contacts."}
									</li>
								) : (
									visibleContacts.map((contact) => {
										const isOn = selected.has(contact.jid);
										return (
											<li key={contact.jid}>
												<button
													type="button"
													onClick={() => toggle(contact.jid)}
													aria-pressed={isOn}
													disabled={submitting}
													className={cn(
														"flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50",
														isOn && "bg-accent",
													)}
												>
													<span
														className={cn(
															"flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
															isOn
																? "bg-primary text-primary-foreground"
																: "bg-muted text-muted-foreground",
														)}
													>
														{initials(contact.name)}
													</span>
													<span className="min-w-0 flex-1">
														<span className="block truncate text-sm font-medium text-foreground">
															{contact.name}
														</span>
														<span className="block truncate text-xs text-muted-foreground">
															{contact.jid}
														</span>
													</span>
													<span
														className={cn(
															"flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
															isOn
																? "border-primary bg-primary text-primary-foreground"
																: "border-border",
														)}
													>
														{isOn && (
															<RiCheckLine className="size-3.5" aria-hidden />
														)}
													</span>
												</button>
											</li>
										);
									})
								)}
							</ul>
						</section>
					</div>

					<DialogFooter className="flex-row items-center justify-between gap-3 border-t border-border bg-muted/40 px-6 py-4 sm:justify-between">
						<p className="text-xs text-muted-foreground">
							Invites go out once the room is created.
						</p>
						<div className="flex gap-2">
							<Button
								type="button"
								variant="ghost"
								onClick={() => onOpenChange(false)}
								disabled={submitting}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={!canSubmit}>
								{submitting ? "Creating…" : "Create group"}
							</Button>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
