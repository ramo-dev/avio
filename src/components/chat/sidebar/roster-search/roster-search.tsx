import { RiSearchLine } from "@remixicon/react";
import { Input } from "#/components/ui/input";

export function RosterSearch({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className="relative">
			<RiSearchLine className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="search"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder="Search contacts"
				aria-label="Search contacts"
				className="pl-8"
			/>
		</div>
	);
}
