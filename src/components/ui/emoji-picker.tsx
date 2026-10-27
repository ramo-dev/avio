import { RiLoader4Line, RiSearchLine } from "@remixicon/react";
import {
	type EmojiPickerListCategoryHeaderProps,
	type EmojiPickerListEmojiProps,
	type EmojiPickerListRowProps,
	EmojiPicker as EmojiPickerPrimitive,
} from "frimousse";
import type { ComponentProps } from "react";
import { cn } from "#/lib/utils";

type EmojiPickerProps = ComponentProps<typeof EmojiPickerPrimitive.Root>;

function EmojiPicker({ className, ...props }: EmojiPickerProps) {
	return (
		<EmojiPickerPrimitive.Root
			data-slot="emoji-picker"
			className={cn(
				"isolate flex h-92 w-fit flex-col bg-popover text-popover-foreground",
				className,
			)}
			{...props}
		/>
	);
}

type EmojiPickerSearchProps = ComponentProps<
	typeof EmojiPickerPrimitive.Search
>;

function EmojiPickerSearch({ className, ...props }: EmojiPickerSearchProps) {
	return (
		<div
			data-slot="emoji-picker-search-wrapper"
			className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3"
		>
			<RiSearchLine
				aria-hidden
				className="size-4 shrink-0 text-muted-foreground"
			/>
			<EmojiPickerPrimitive.Search
				data-slot="emoji-picker-search"
				aria-label="Search emoji"
				className={cn(
					"h-full w-full bg-transparent text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
					className,
				)}
				{...props}
			/>
		</div>
	);
}

type EmojiPickerContentProps = ComponentProps<
	typeof EmojiPickerPrimitive.Viewport
>;

function EmojiPickerRow({ children, ...props }: EmojiPickerListRowProps) {
	return (
		<div {...props} data-slot="emoji-picker-row" className="scroll-my-1 px-1.5">
			{children}
		</div>
	);
}

function EmojiPickerEmoji({ emoji, ...props }: EmojiPickerListEmojiProps) {
	return (
		<button
			{...props}
			type="button"
			data-slot="emoji-picker-emoji"
			className="flex size-8 items-center justify-center rounded-md text-lg outline-hidden data-active:bg-accent"
		>
			{emoji.emoji}
		</button>
	);
}

function EmojiPickerCategoryHeader({
	category,
	...props
}: EmojiPickerListCategoryHeaderProps) {
	return (
		<div
			{...props}
			data-slot="emoji-picker-category"
			className="bg-popover px-3 pb-1.5 pt-3 text-xs font-medium text-muted-foreground"
		>
			{category.label}
		</div>
	);
}

function EmojiPickerContent({ className, ...props }: EmojiPickerContentProps) {
	return (
		<EmojiPickerPrimitive.Viewport
			data-slot="emoji-picker-viewport"
			className={cn("relative flex-1 outline-hidden", className)}
			{...props}
		>
			<EmojiPickerPrimitive.Loading
				data-slot="emoji-picker-loading"
				className="absolute inset-0 flex items-center justify-center text-muted-foreground"
			>
				<RiLoader4Line className="size-4 animate-spin" aria-label="Loading" />
			</EmojiPickerPrimitive.Loading>
			<EmojiPickerPrimitive.Empty
				data-slot="emoji-picker-empty"
				className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
			>
				No emoji found
			</EmojiPickerPrimitive.Empty>
			<EmojiPickerPrimitive.List
				data-slot="emoji-picker-list"
				className="select-none pb-1.5"
				components={{
					Row: EmojiPickerRow,
					Emoji: EmojiPickerEmoji,
					CategoryHeader: EmojiPickerCategoryHeader,
				}}
			/>
		</EmojiPickerPrimitive.Viewport>
	);
}

type EmojiPickerFooterProps = ComponentProps<"div">;

function EmojiPickerFooter({ className, ...props }: EmojiPickerFooterProps) {
	return (
		<div
			data-slot="emoji-picker-footer"
			className={cn(
				"flex h-10 w-full shrink-0 items-center gap-2 border-t border-border px-3",
				className,
			)}
			{...props}
		>
			<EmojiPickerPrimitive.ActiveEmoji>
				{({ emoji }) =>
					emoji ? (
						<>
							<span className="text-lg">{emoji.emoji}</span>
							<span className="truncate text-xs text-muted-foreground">
								{emoji.label}
							</span>
						</>
					) : (
						<span className="truncate text-xs text-muted-foreground">
							Select an emoji
						</span>
					)
				}
			</EmojiPickerPrimitive.ActiveEmoji>
		</div>
	);
}

export {
	EmojiPicker,
	EmojiPickerContent,
	EmojiPickerFooter,
	EmojiPickerSearch,
};
