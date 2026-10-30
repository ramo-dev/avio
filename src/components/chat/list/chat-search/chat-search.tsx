import { RiCloseLine, RiSearchLine } from "@remixicon/react";
import { useEffect, useRef } from "react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "#/components/ui/input-group";
import { Kbd } from "#/components/ui/kbd";

export function ChatSearch({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		function handleShortcut(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				inputRef.current?.focus();
			}
		}
		window.addEventListener("keydown", handleShortcut);
		return () => window.removeEventListener("keydown", handleShortcut);
	}, []);

	return (
		<InputGroup>
			<InputGroupAddon>
				<RiSearchLine />
			</InputGroupAddon>
			<InputGroupInput
				ref={inputRef}
				type="search"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder="Search conversations"
				aria-label="Search conversations"
			/>
			<InputGroupAddon align="inline-end">
				{value ? (
					<InputGroupButton
						size="icon-xs"
						aria-label="Clear search"
						onClick={() => {
							onChange("");
							inputRef.current?.focus();
						}}
					>
						<RiCloseLine />
					</InputGroupButton>
				) : (
					<Kbd>⌘K</Kbd>
				)}
			</InputGroupAddon>
		</InputGroup>
	);
}
