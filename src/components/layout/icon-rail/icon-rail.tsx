import { RiChat3Line, RiChatSmile2Line } from "@remixicon/react";
import { useNavigate } from "@tanstack/react-router";
import { AccountMenu } from "#/components/chat/common/account-menu/account-menu";
import { Button } from "#/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";

export function IconRail({ onAction }: { onAction?: () => void }) {
	const navigate = useNavigate();

	return (
		<nav
			aria-label="Primary"
			className="flex w-16 shrink-0 flex-col items-center gap-3 border-r border-border bg-card px-2 py-3"
		>
			<Button
				variant="ghost"
				size="icon-lg"
				className="size-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
				aria-label="Avio home"
				onClick={() => {
					onAction?.();
					navigate({ to: "/chat" });
				}}
			>
				<RiChatSmile2Line className="size-5" />
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

			<div className="mt-auto flex flex-col items-center gap-3">
				<AccountMenu onOpen={onAction} />
			</div>
		</nav>
	);
}
