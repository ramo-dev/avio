import {
	RiArrowDownLine,
	RiArrowUpLine,
	RiCloseLine,
	RiSearchLine,
} from "@remixicon/react";
import { useEffect, useRef } from "react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "#/components/ui/input-group";

export function InThreadSearch({
	query,
	onQueryChange,
	count,
	index,
	onPrevious,
	onNext,
	onClose,
}: {
	query: string;
	onQueryChange: (query: string) => void;
	count: number;
	index: number;
	onPrevious: () => void;
	onNext: () => void;
	onClose: () => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	return (
		<div className="shrink-0 border-b border-border bg-background px-3 py-2">
			<InputGroup>
				<InputGroupAddon>
					<RiSearchLine />
				</InputGroupAddon>
				<InputGroupInput
					ref={inputRef}
					value={query}
					onChange={(event) => onQueryChange(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							if (event.shiftKey) onPrevious();
							else onNext();
						}
						if (event.key === "Escape") {
							event.preventDefault();
							onClose();
						}
					}}
					placeholder="Search in conversation"
					aria-label="Search in conversation"
				/>
				<InputGroupAddon align="inline-end">
					<span className="px-1 text-xs text-muted-foreground">
						{count === 0 ? "0/0" : `${index + 1}/${count}`}
					</span>
					<InputGroupButton
						size="icon-xs"
						onClick={onPrevious}
						disabled={count === 0}
						aria-label="Previous match"
					>
						<RiArrowUpLine />
					</InputGroupButton>
					<InputGroupButton
						size="icon-xs"
						onClick={onNext}
						disabled={count === 0}
						aria-label="Next match"
					>
						<RiArrowDownLine />
					</InputGroupButton>
					<InputGroupButton
						size="icon-xs"
						onClick={onClose}
						aria-label="Close search"
					>
						<RiCloseLine />
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
		</div>
	);
}
