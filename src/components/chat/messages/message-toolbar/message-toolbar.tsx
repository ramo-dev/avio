import {
	RiDeleteBinLine,
	RiEditLine,
	RiEmotionLine,
	RiFileCopyLine,
	RiReplyLine,
} from "@remixicon/react";
import { type ReactNode, useState } from "react";
import { MessageForwardAction } from "#/components/chat/messages/message-forward/message-forward";
import { ResponsiveDialog } from "#/components/common/responsive-dialog/responsive-dialog";
import { Button } from "#/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
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
	const [deleteOpen, setDeleteOpen] = useState(false);

	return (
		<>
			<div className="flex items-center gap-0.5 rounded-full border border-border bg-popover p-0.5 shadow-sm">
				<ToolbarButton label="Reply" onClick={onReply}>
					<RiReplyLine className="size-3.5" />
				</ToolbarButton>
				{onEdit && (
					<ToolbarButton label="Edit message" onClick={onEdit}>
						<RiEditLine className="size-3.5" />
					</ToolbarButton>
				)}
				{onCopy && (
					<ToolbarButton label="Copy message" onClick={onCopy}>
						<RiFileCopyLine className="size-3.5" />
					</ToolbarButton>
				)}
				{onDelete && (
					<ToolbarButton
						label="Delete message"
						onClick={() => setDeleteOpen(true)}
					>
						<RiDeleteBinLine className="size-3.5" />
					</ToolbarButton>
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
					<Tooltip>
						<TooltipTrigger render={<span className="inline-flex" />}>
							<PopoverTrigger
								render={
									<Button
										type="button"
										variant="ghost"
										size="icon"
										aria-label="Add reaction"
										className="size-7 rounded-full text-muted-foreground"
									/>
								}
							>
								<RiEmotionLine className="size-3.5" />
							</PopoverTrigger>
						</TooltipTrigger>
						<TooltipContent>Add reaction</TooltipContent>
					</Tooltip>
					<PopoverContent side="top" align="end" className="w-auto p-1">
						<div className="flex items-center gap-0.5">
							{QUICK_REACTIONS.map((emoji) => (
								<Button
									key={emoji}
									type="button"
									variant="ghost"
									size="icon"
									aria-label={`React with ${emoji}`}
									title={`React with ${emoji}`}
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

			{onDelete && (
				<ResponsiveDialog
					open={deleteOpen}
					onOpenChange={setDeleteOpen}
					title="Delete message?"
					description="This removes the message from this conversation for you."
					footer={
						<>
							<Button
								type="button"
								variant="outline"
								onClick={() => setDeleteOpen(false)}
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="destructive"
								onClick={() => {
									onDelete();
									setDeleteOpen(false);
								}}
							>
								Delete
							</Button>
						</>
					}
				/>
			)}
		</>
	);
}

function ToolbarButton({
	label,
	onClick,
	children,
}: {
	label: string;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label={label}
						className="size-7 rounded-full text-muted-foreground"
						onClick={onClick}
					/>
				}
			>
				{children}
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}
