import {
	RiArchiveLine,
	RiEmotionLine,
	RiFileCopyLine,
	RiForbidLine,
	RiGlobalLine,
	RiTeamLine,
	RiUploadLine,
	RiUser3Line,
	RiWifiLine,
} from "@remixicon/react";
import { cn } from "cn";
import type { ServerServiceView } from "#/lib/xmpp/server-capability-view";
import { InsecureCallout } from "./insecure-callout";
import { StatusPill, StatusTile } from "./status-bits";

const SERVICE_ICONS: Record<string, typeof RiGlobalLine> = {
	transport: RiWifiLine,
	reactions: RiEmotionLine,
	stun: RiWifiLine,
	muc: RiTeamLine,
	upload: RiUploadLine,
	mam: RiArchiveLine,
	carbons: RiFileCopyLine,
	blocklist: RiForbidLine,
	pep: RiUser3Line,
	srv: RiGlobalLine,
};

/**
 * One detected capability: icon tile, name, description, optional mono
 * detail, and its status pill. Insecure rows embed the fix-it callout.
 */
export function ServiceRow({ service }: { service: ServerServiceView }) {
	const Icon = SERVICE_ICONS[service.id] ?? RiGlobalLine;
	const showDescriptionBelow =
		service.description && service.description.length >= 24;

	return (
		<li className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/50">
			<StatusTile status={service.status}>
				<Icon className="size-4" />
			</StatusTile>

			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
					<p className="text-sm font-medium">{service.name}</p>
					{service.description && !showDescriptionBelow && (
						<span className="text-xs text-muted-foreground">
							{service.description}
						</span>
					)}
				</div>
				{showDescriptionBelow && (
					<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
						{service.description}
					</p>
				)}
				{service.status === "insecure" && <InsecureCallout />}
			</div>

			<div className="flex shrink-0 items-center gap-2">
				{service.detail && (
					<span className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground">
						{service.detail}
					</span>
				)}
				<StatusPill status={service.status} label={service.statusLabel} />
			</div>
		</li>
	);
}

/** Groups services under a filled status heading with the row list. */
export function ServiceGroup({
	title,
	hint,
	count,
}: {
	title: string;
	hint: string;
	count?: number;
}) {
	return (
		<div className="flex items-baseline justify-between px-1">
			<div>
				<h3
					className={cn(
						"text-sm font-semibold",
						count !== undefined && count === 0 && "text-muted-foreground",
					)}
				>
					{title}
				</h3>
				<p className="text-xs text-muted-foreground">{hint}</p>
			</div>
			{count !== undefined && (
				<span className="text-xs text-muted-foreground tabular-nums">
					{count}
				</span>
			)}
		</div>
	);
}
