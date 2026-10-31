import {
	RiAlertLine,
	RiLockUnlockLine,
	RiShieldCheckLine,
} from "@remixicon/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { SettingsOmemoCard } from "#/components/settings/settings-omemo-card/settings-omemo-card";
import { SettingsOmemoPreferences } from "#/components/settings/settings-omemo-card/settings-omemo-preferences";
import { SettingsSection } from "#/components/settings/settings-section/settings-section";
import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";
import { useSettings } from "#/providers/settings-provider";

export const OMEMO_SETTINGS_ID = "settings-omemo";

const OMEMO_FOCUS_MS = 1_600;

export function SettingsSecurity({ anchor }: { anchor?: "omemo" }) {
	const { clearTarget } = useSettings();
	const [focusOmemo, setFocusOmemo] = useState(anchor === "omemo");

	useEffect(() => {
		if (!focusOmemo) return;
		const frame = window.requestAnimationFrame(() => {
			document
				.getElementById(OMEMO_SETTINGS_ID)
				?.scrollIntoView({ behavior: "smooth", block: "center" });
		});
		const timer = window.setTimeout(() => {
			setFocusOmemo(false);
			clearTarget();
		}, OMEMO_FOCUS_MS);
		return () => {
			window.cancelAnimationFrame(frame);
			window.clearTimeout(timer);
		};
	}, [clearTarget, focusOmemo]);

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
				/>
				<StatusRow
					icon={<RiLockUnlockLine className="size-4" />}
					title="End-to-end encryption"
					value="Opt-in"
					tone="secondary"
				/>
				<StatusRow
					icon={<RiAlertLine className="size-4" />}
					title="OpenPGP"
					value="Deferred"
					tone="outline"
				/>
			</div>

			<div
				id={OMEMO_SETTINGS_ID}
				className={cn(
					"rounded-xl transition-[box-shadow] duration-300",
					focusOmemo && "ring-2 ring-ring/60",
				)}
			>
				<SettingsOmemoCard />
			</div>
			<SettingsOmemoPreferences />

			<p className="text-xs leading-relaxed text-muted-foreground">
				Development preview. OMEMO is experimental and unaudited. Do not use
				this build for sensitive conversations.
			</p>
		</SettingsSection>
	);
}

function StatusRow({
	icon,
	title,
	value,
	tone,
}: {
	icon: ReactNode;
	title: string;
	value: string;
	tone: "default" | "secondary" | "outline" | "destructive";
}) {
	return (
		<div className="flex items-center gap-3">
			<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
				{icon}
			</span>
			<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
				<p className="text-sm font-medium">{title}</p>
				<Badge variant={tone}>{value}</Badge>
			</div>
		</div>
	);
}
