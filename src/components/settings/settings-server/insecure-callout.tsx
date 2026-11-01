import { RiLockUnlockLine } from "@remixicon/react";

/**
 * Shows the fix-it guidance under an insecure transport row. Links to the
 * server-admin portion of the modernxmpp guide (HTTPS certs + wss endpoints).
 */
export function InsecureCallout() {
	return (
		<div className="mt-3 flex gap-3 rounded-lg border border-warning/20 bg-warning/5 p-3">
			<RiLockUnlockLine className="mt-0.5 size-4 shrink-0 text-warning" />
			<div className="flex-1 space-y-2">
				<p className="text-xs leading-relaxed text-warning/90">
					Your connection isn&apos;t encrypted. Switch the server to wss://
					before using this in production.
				</p>
				<a
					className="inline-flex h-7 items-center gap-1 rounded-md border border-warning/30 px-2.5 text-xs font-medium text-warning transition-colors hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/60"
					href="https://docs.modernxmpp.org/server/"
					target="_blank"
					rel="noopener noreferrer"
				>
					Learn how to fix
				</a>
			</div>
		</div>
	);
}
