import { RiCheckLine, RiFileCopyLine } from "@remixicon/react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";

export function HeaderActions({ jid }: { jid: string }) {
	const [copied, setCopied] = useState(false);

	async function copyJid() {
		try {
			await navigator.clipboard.writeText(jid);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			setCopied(false);
		}
	}

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => void copyJid()}
						aria-label="Copy JID"
					/>
				}
			>
				{copied ? <RiCheckLine /> : <RiFileCopyLine />}
			</TooltipTrigger>
			<TooltipContent>{copied ? "Copied" : "Copy JID"}</TooltipContent>
		</Tooltip>
	);
}
