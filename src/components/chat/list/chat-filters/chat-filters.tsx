import { RiArrowDownSLine } from "@remixicon/react";
import { Button } from "#/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import type { ChatFilter, ChatSort } from "#/types/chat-ui";

const FILTERS: Array<{ value: ChatFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "unread", label: "Unread" },
    { value: "favorites", label: "Starred" },
    { value: "archived", label: "Archived" },
];

export function ChatFilters({
    filter,
    sort,
    onFilterChange,
    onSortChange,
}: {
    filter: ChatFilter;
    sort: ChatSort;
    onFilterChange: (filter: ChatFilter) => void;
    onSortChange: (sort: ChatSort) => void;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-2 md:px-2 px-3 py-2">
            <ToggleGroup
                size="sm"
                variant="outline"
                spacing={0}
                className="w-max max-w-full"
                value={[filter]}
                onValueChange={(value) => {
                    const next = value.at(-1) as ChatFilter | undefined;
                    onFilterChange(next ?? "all");
                }}
            >
                {FILTERS.map((item) => (
                    <ToggleGroupItem key={item.value} value={item.value}>
                        {item.label}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>

            <div className="ml-auto">
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={<Button variant="ghost" size="sm" className="gap-1 flex-1 min-w-full!" />}
                    >
                        {sort === "newest" ? "Newest" : "Oldest"}
                        <RiArrowDownSLine className="size-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSortChange("newest")}>
                            Newest
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSortChange("oldest")}>
                            Oldest
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
