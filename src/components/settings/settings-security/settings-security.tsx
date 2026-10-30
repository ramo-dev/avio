import {
	RiAlertLine,
	RiLockLine,
	RiLockUnlockLine,
	RiShieldCheckLine,
} from "@remixicon/react";
import type { ReactNode } from "react";
import { SettingsSection } from "#/components/settings/settings-section/settings-section";
import { Badge } from "#/components/ui/badge";

export function SettingsSecurity() {
	return (
		<SettingsSection
			title="Security"
			description="Transport protection and end-to-end encryption status for this build."
		>
			<div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
				<StatusRow
					icon={<RiShieldCheckLine className="size-4" />}
					title="Transport"
					value="TLS"
					tone="default"
					description="Messages travel over WSS or HTTPS when your server uses a secure endpoint."
				/>
				<StatusRow
					icon={<RiLockUnlockLine className="size-4" />}
					title="End-to-end encryption"
					value="Not available"
					tone="destructive"
					description="The server and anyone with server access can read messages in this build."
				/>
				<StatusRow
					icon={<RiLockLine className="size-4" />}
					title="OMEMO"
					value="In progress"
					tone="secondary"
					description="Key storage, PEP bundles, and 1:1 message encryption are implemented, but OMEMO is not enabled in the app and has not been independently audited."
				/>
				<StatusRow
					icon={<RiAlertLine className="size-4" />}
					title="OpenPGP"
					value="Deferred"
					tone="outline"
					description="XEP-0374 support is a later interoperability option, not enabled here."
				/>
			</div>

			<p className="text-xs leading-relaxed text-muted-foreground">
				Do not use this development build for sensitive conversations. TLS
				protects the connection, not the message contents.
			</p>
		</SettingsSection>
	);
}

function StatusRow({
	icon,
	title,
	value,
	description,
	tone,
}: {
	icon: ReactNode;
	title: string;
	value: string;
	description: string;
	tone: "default" | "secondary" | "outline" | "destructive";
}) {
	return (
		<div className="flex items-start gap-3">
			<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
				{icon}
			</span>
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<p className="text-sm font-medium">{title}</p>
					<Badge variant={tone}>{value}</Badge>
				</div>
				<p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
					{description}
				</p>
			</div>
		</div>
	);
}
