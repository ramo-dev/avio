import {
	RiAtLine,
	RiCheckLine,
	RiFileCopyLine,
	RiGlobalLine,
	RiUserSharedLine,
} from "@remixicon/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { ContactInfoOmemo } from "#/components/chat/conversation/header/contact-info-panel/contact-info-omemo";
import { UserAvatar } from "#/components/common/user-avatar/user-avatar";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { useXmppState } from "#/hooks/xmpp/use-xmpp";
import { presenceDotClassName } from "#/lib/format/presence";
import { formatLastSeen } from "#/lib/format/time";
import { cn } from "#/lib/utils";
import { displayJidName } from "#/lib/xmpp/jid";
import { OFFLINE_PRESENCE, presenceLabel } from "#/lib/xmpp/presence";

type SubscriptionInfo = {
	label: string;
	description: string;
	variant: "default" | "secondary" | "outline";
};

const SUBSCRIPTIONS: Record<string, SubscriptionInfo> = {
	both: {
		label: "Mutual",
		description: "You can see each other's presence",
		variant: "default",
	},
	to: {
		label: "Following",
		description: "You see their presence",
		variant: "secondary",
	},
	from: {
		label: "Follower",
		description: "They see your presence",
		variant: "secondary",
	},
	none: {
		label: "None",
		description: "No presence is shared",
		variant: "outline",
	},
};

function DetailRow({
	icon,
	label,
	children,
	className,
}: {
	icon: ReactNode;
	label: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex items-center gap-3 px-4 py-3", className)}>
			<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
				{icon}
			</span>
			<div className="min-w-0 flex-1">
				<p className="text-xs text-muted-foreground">{label}</p>
				<div className="mt-0.5 text-sm">{children}</div>
			</div>
		</div>
	);
}

export function ContactInfoPanel({
	jid,
	showOmemo = true,
}: {
	jid: string;
	showOmemo?: boolean;
}) {
	const state = useXmppState();
	const contact = state.contacts[jid];
	const name = displayJidName(jid, contact?.name);
	const presence = contact?.presence ?? OFFLINE_PRESENCE;
	const status =
		presence.show === "offline" && presence.lastSeen
			? formatLastSeen(presence.lastSeen)
			: presence.status || presenceLabel(presence);

	const subscription =
		SUBSCRIPTIONS[contact?.subscription ?? "none"] ?? SUBSCRIPTIONS.none;
	const domain = jid.includes("@") ? jid.split("@")[1]?.split("/")[0] : null;

	const [copied, setCopied] = useState(false);
	const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (resetTimer.current) clearTimeout(resetTimer.current);
		},
		[],
	);

	async function copyJid() {
		try {
			await navigator.clipboard.writeText(jid);
			toast.success("JID copied");
			setCopied(true);
			if (resetTimer.current) clearTimeout(resetTimer.current);
			resetTimer.current = setTimeout(() => setCopied(false), 1500);
		} catch {
			toast.error("Could not copy the JID");
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-col items-center gap-4 rounded-xl bg-muted/80 border border-border/40 px-4 pb-6 pt-8 text-center">
				<div className="relative">
					<UserAvatar
						jid={jid}
						name={name}
						size="lg"
						className="size-14! ring-2 ring-background"
					/>
					<span
						role="img"
						aria-label={presenceLabel(presence)}
						className={cn(
							"absolute bottom-0 right-0 size-4 rounded-full border-2 border-background",
							presenceDotClassName(presence.show),
						)}
					/>
				</div>
				<div className="min-w-0 max-w-full space-y-1">
					<h3 className="truncate text-xl font-semibold">{name}</h3>
					<p className="truncate text-sm text-muted-foreground">{status}</p>
				</div>
			</div>

			<dl className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
				<DetailRow icon={<RiAtLine />} label="JID">
					<div className="flex items-center justify-between gap-2">
						<span className="min-w-0 truncate font-medium">{jid}</span>
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										onClick={() => void copyJid()}
										aria-label="Copy JID"
										className="shrink-0 text-muted-foreground"
									/>
								}
							>
								{copied ? <RiCheckLine /> : <RiFileCopyLine />}
							</TooltipTrigger>
							<TooltipContent>{copied ? "Copied" : "Copy JID"}</TooltipContent>
						</Tooltip>
					</div>
				</DetailRow>

				{domain && (
					<DetailRow icon={<RiGlobalLine />} label="Server">
						<span className="block truncate font-medium">{domain}</span>
					</DetailRow>
				)}

				<DetailRow icon={<RiUserSharedLine />} label="Subscription">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
						<Badge variant={subscription.variant}>{subscription.label}</Badge>
						<span className="text-xs text-muted-foreground">
							{subscription.description}
						</span>
					</div>
				</DetailRow>
			</dl>

			{showOmemo && <ContactInfoOmemo jid={jid} />}
		</div>
	);
}
