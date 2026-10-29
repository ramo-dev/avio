import {
	RiAddLine,
	RiChat3Line,
	RiGroupLine,
	RiSettings3Line,
} from "@remixicon/react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "#/assets/logo/Logo";
import { AccountMenu } from "#/components/chat/common/account-menu/account-menu";
import { CreateGroupDialog } from "#/components/chat/groups/create-group-dialog/create-group-dialog";
import { Button } from "#/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { useSettings } from "#/providers/settings-provider";

export function IconRail({ onAction }: { onAction?: () => void }) {
	const navigate = useNavigate();
	const { setOpen } = useSettings();
	const [groupOpen, setGroupOpen] = useState(false);

	return (
		<>
			<nav
				aria-label="Primary"
				className="flex w-16 shrink-0 flex-col items-center gap-3 border-r border-border bg-card px-2 py-3"
			>
				<Button
					variant="ghost"
					size="icon-lg"
					className="size-7"
					aria-label="Avio home"
					onClick={() => {
						onAction?.();
						navigate({ to: "/chat" });
					}}
				>
					<Logo className="size-7" />
				</Button>

				<div className="h-px w-8 bg-border" />

				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant="secondary"
								size="icon-lg"
								className="size-10"
								aria-label="Chats"
								onClick={() => {
									onAction?.();
									navigate({ to: "/chat" });
								}}
							/>
						}
					>
						<RiChat3Line className="size-5" />
					</TooltipTrigger>
					<TooltipContent side="right">Chats</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant="ghost"
								size="icon-lg"
								className="size-10"
								aria-label="New group"
								onClick={() => {
									onAction?.();
									setGroupOpen(true);
								}}
							/>
						}
					>
						<span className="relative inline-flex">
							<RiGroupLine className="size-5" />
							<RiAddLine className="absolute -bottom-1 -right-1 size-3 rounded-full bg-card" />
						</span>
					</TooltipTrigger>
					<TooltipContent side="right">New group</TooltipContent>
				</Tooltip>

				<div className="mt-auto flex flex-col items-center gap-3">
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									variant="ghost"
									size="icon-lg"
									className="size-10"
									aria-label="Settings"
									onClick={() => {
										onAction?.();
										setOpen(true);
									}}
								/>
							}
						>
							<RiSettings3Line className="size-5" />
						</TooltipTrigger>
						<TooltipContent side="right">Settings</TooltipContent>
					</Tooltip>
					<AccountMenu onOpen={onAction} />
				</div>
			</nav>
			<CreateGroupDialog
				key={groupOpen ? "open" : "closed"}
				open={groupOpen}
				onOpenChange={setGroupOpen}
			/>
		</>
	);
}
