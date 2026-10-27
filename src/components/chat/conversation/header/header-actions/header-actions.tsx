import {
	RiDeleteBin6Line,
	RiFileCopyLine,
	RiMore2Line,
	RiSearchLine,
	RiUserLine,
} from "@remixicon/react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "react-hot-toast";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { useXmppActions } from "#/hooks/xmpp/use-xmpp";

export function HeaderActions({
	jid,
	searchOpen,
	onToggleSearch,
	onOpenInfo,
}: {
	jid: string;
	searchOpen: boolean;
	onToggleSearch: () => void;
	onOpenInfo: () => void;
}) {
	const actions = useXmppActions();
	const navigate = useNavigate();
	const [clearOpen, setClearOpen] = useState(false);

	async function copyJid() {
		try {
			await navigator.clipboard.writeText(jid);
			toast.success("JID copied");
		} catch {
			toast.error("Could not copy the JID");
		}
	}

	function clearChat() {
		actions.deleteConversation(jid);
		setClearOpen(false);
		void navigate({ to: "/chat" });
	}

	return (
		<>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							variant={searchOpen ? "secondary" : "ghost"}
							size="icon-sm"
							onClick={onToggleSearch}
							aria-label="Search in conversation"
						/>
					}
				>
					<RiSearchLine />
				</TooltipTrigger>
				<TooltipContent>Search</TooltipContent>
			</Tooltip>

			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Conversation actions"
						/>
					}
				>
					<RiMore2Line />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={onOpenInfo}>
						<RiUserLine />
						Contact info
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => void copyJid()}>
						<RiFileCopyLine />
						Copy JID
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						variant="destructive"
						onClick={() => setClearOpen(true)}
					>
						<RiDeleteBin6Line />
						Clear chat
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Clear this chat?</AlertDialogTitle>
						<AlertDialogDescription>
							This removes the local message history for this conversation.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={clearChat}>
							Clear chat
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
