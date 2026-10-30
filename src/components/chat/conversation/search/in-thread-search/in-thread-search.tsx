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
import { cn } from "#/lib/utils";

type InThreadSearchProps = {
    query: string;
    onQueryChange: (query: string) => void;
    count: number;
    index: number;
    onPrevious: () => void;
    onNext: () => void;
    onClose: () => void;
    className?: string;
};

export function InThreadSearch({
    query,
    onQueryChange,
    count,
    index,
    onPrevious,
    onNext,
    onClose,
    className,
}: InThreadSearchProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        switch (event.key) {
            case "Enter":
                event.preventDefault();
                if (count === 0) return;
                if (event.shiftKey) onPrevious();
                else onNext();
                break;
            case "ArrowDown":
                event.preventDefault();
                if (count > 0) onNext();
                break;
            case "ArrowUp":
                event.preventDefault();
                if (count > 0) onPrevious();
                break;
            case "Escape":
                event.preventDefault();
                onClose();
                break;
        }
    }

    const hasMatches = count > 0;

    return (
        <div
            className={cn(
                "sticky top-2 z-30 md:ml-auto md:mr-3 my-2 shrink-0 animate-in fade-in slide-in-from-top-1 duration-150",
                className,
            )}
        >
            <InputGroup
                className={cn(
                    "h-10 rounded-lg border-border/60 bg-popover/95 shadow-lg backdrop-blur-md",
                    "supports-[backdrop-filter]:bg-popover/80",
                    "transition-shadow duration-200 focus-within:border-ring focus-within:shadow-xl focus-within:ring-2 focus-within:ring-ring/20",
                )}
            >
                <InputGroupAddon className="pl-3 text-muted-foreground">
                    <RiSearchLine className="size-4" />
                </InputGroupAddon>

                <InputGroupInput
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Find in conversation"
                    aria-label="Search in conversation"
                    className="border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none"
                />

                <InputGroupAddon align="inline-end" className="gap-0.5 pr-1.5">
                    <span
                        aria-live="polite"
                        className={cn(
                            "mr-1 min-w-[3.5rem] text-right text-xs tabular-nums",
                            hasMatches ? "text-muted-foreground" : "text-destructive",
                            query && !hasMatches && "font-medium",
                        )}
                    >
                        {!query ? "" : hasMatches ? `${index + 1} of ${count}` : "No results"}
                    </span>

                    <InputGroupButton
                        variant="ghost"
                        size="icon-xs"
                        onClick={onPrevious}
                        disabled={!hasMatches}
                        aria-label="Previous match"
                        title="Previous (Shift+Enter)"
                        className="rounded-md text-muted-foreground hover:text-foreground"
                    >
                        <RiArrowUpLine className="size-4" />
                    </InputGroupButton>

                    <InputGroupButton
                        variant="ghost"
                        size="icon-xs"
                        onClick={onNext}
                        disabled={!hasMatches}
                        aria-label="Next match"
                        title="Next (Enter)"
                        className="rounded-md text-muted-foreground hover:text-foreground"
                    >
                        <RiArrowDownLine className="size-4" />
                    </InputGroupButton>

                    <span aria-hidden className="mx-1 h-4 w-px bg-border" />

                    <InputGroupButton
                        variant="ghost"
                        size="icon-xs"
                        onClick={onClose}
                        aria-label="Close search"
                        title="Close (Esc)"
                        className="rounded-md text-muted-foreground hover:text-foreground"
                    >
                        <RiCloseLine className="size-4" />
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        </div>
    );
}
