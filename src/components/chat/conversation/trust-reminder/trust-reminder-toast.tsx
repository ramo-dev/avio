import { RiShieldKeyholeLine } from "@remixicon/react";
import { Button } from "#/components/ui/button";

/** Actionable toast that leads from a conversation to its device list. */
export function TrustReminderToast({
	name,
	count,
	onReview,
	onDismiss,
}: {
	name: string;
	count: number;
	onReview: () => void;
	onDismiss: () => void;
}) {
	return (
		<div className="pointer-events-auto flex w-80 items-start gap-3 rounded-[0.625rem] border border-border bg-popover p-3 text-popover-foreground shadow-lg">
			<span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
				<RiShieldKeyholeLine className="size-4" />
			</span>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">
					Trust {name}&apos;s device
				</p>
				<p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
					{count === 1
						? "1 device is not trusted yet."
						: `${count} devices are not trusted yet.`}{" "}
					Review the fingerprint to send encrypted messages.
				</p>
				<div className="mt-2 flex items-center gap-2">
					<Button type="button" size="xs" onClick={onReview}>
						Review devices
					</Button>
					<Button type="button" size="xs" variant="ghost" onClick={onDismiss}>
						Later
					</Button>
				</div>
			</div>
		</div>
	);
}
