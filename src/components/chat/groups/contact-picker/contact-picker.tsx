import { useMemo, useState } from "react";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { ScrollArea } from "#/components/ui/scroll-area";

export interface PickerContact {
	jid: string;
	name: string;
}

export function ContactPicker({
	contacts,
	selected,
	onToggle,
	disabled = false,
	emptyLabel = "No contacts found.",
}: {
	contacts: PickerContact[];
	selected: Set<string>;
	onToggle: (jid: string, checked: boolean) => void;
	disabled?: boolean;
	emptyLabel?: string;
}) {
	const [query, setQuery] = useState("");
	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return contacts;
		return contacts.filter(
			(contact) =>
				contact.name.toLowerCase().includes(needle) ||
				contact.jid.toLowerCase().includes(needle),
		);
	}, [contacts, query]);

	return (
		<div className="space-y-2">
			<Input
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				placeholder="Search contacts…"
				aria-label="Search contacts"
				disabled={disabled}
			/>
			<ScrollArea className="h-56 rounded-md border border-border">
				<div className="divide-y divide-border">
					{filtered.length === 0 ? (
						<p className="px-3 py-6 text-center text-sm text-muted-foreground">
							{emptyLabel}
						</p>
					) : (
						filtered.map((contact) => (
							<div
								key={contact.jid}
								className="flex items-center gap-3 px-3 py-2"
							>
								<Checkbox
									id={`contact-picker-${contact.jid}`}
									checked={selected.has(contact.jid)}
									onCheckedChange={(checked) =>
										onToggle(contact.jid, checked === true)
									}
									aria-label={`Select ${contact.name}`}
									disabled={disabled}
								/>
								<UserAvatar jid={contact.jid} name={contact.name} size="sm" />
								<label
									htmlFor={`contact-picker-${contact.jid}`}
									className="min-w-0 flex-1 cursor-pointer"
								>
									<span className="block truncate text-sm font-medium">
										{contact.name}
									</span>
									<span className="block truncate text-xs text-muted-foreground">
										{contact.jid}
									</span>
								</label>
							</div>
						))
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
