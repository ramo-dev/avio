import {
	RiDeleteBinLine,
	RiEditLine,
	RiEmotionLine,
	RiFileCopyLine,
	RiReplyLine,
} from "@remixicon/react";
import { useState } from "react";
import { MessageForwardAction } from "#/components/chat/messages/message-forward/message-forward";
import { Button } from "#/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import type { ChatMessage } from "#/types/chat";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

export function MessageToolbar({
	onReply,
	onEdit,
	onReact,
	onCopy,
	onDelete,
	forwardSource,
	onForwarded,
	forwardOpen,
	onForwardOpenChange,
}: {
	onReply: () => void;
	onEdit?: () => void;
	onReact: (emoji: string) => void;
	onCopy?: () => void;
	onDelete?: () => void;
	forwardSource?: ChatMessage;
	onForwarded?: () => void;
	forwardOpen?: boolean;
	onForwardOpenChange?: (open: boolean) => void;
}) {
	const [open, setOpen] = useState(false);

	return (
		<div className="flex items-center gap-0.5 rounded-full border border-border bg-popover p-0.5 shadow-sm">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				aria-label="Reply"
				title="Reply"
				className="size-7 rounded-full text-muted-foreground"
				onClick={onReply}
			>
				<RiReplyLine className="size-3.5" />
			</Button>
			{onEdit && (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label="Edit message"
					title="Edit message"
					className="size-7 rounded-full text-muted-foreground"
					onClick={onEdit}
				>
					<RiEditLine className="size-3.5" />
				</Button>
			)}
			{onCopy && (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label="Copy message"
					title="Copy message"
					className="size-7 rounded-full text-muted-foreground"
					onClick={onCopy}
				>
					<RiFileCopyLine className="size-3.5" />
				</Button>
			)}
			{onDelete && (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label="Remove message locally"
					title="Remove message locally"
					className="size-7 rounded-full text-muted-foreground"
					onClick={onDelete}
				>
					<RiDeleteBinLine className="size-3.5" />
				</Button>
			)}
			{forwardSource && (
				<MessageForwardAction
					message={forwardSource}
					onForwarded={onForwarded}
					open={forwardOpen}
					onOpenChange={onForwardOpenChange}
				/>
			)}
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label="Add reaction"
							title="Add reaction"
							className="size-7 rounded-full text-muted-foreground"
						/>
					}
				>
					<RiEmotionLine className="size-3.5" />
				</PopoverTrigger>
				<PopoverContent side="top" align="end" className="w-auto p-1">
					<div className="flex items-center gap-0.5">
						{QUICK_REACTIONS.map((emoji) => (
							<Button
								key={emoji}
								type="button"
								variant="ghost"
								size="icon"
								aria-label={`React with ${emoji}`}
								className="size-8 text-base"
								onClick={() => {
									onReact(emoji);
									setOpen(false);
								}}
							>
								{emoji}
							</Button>
						))}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
