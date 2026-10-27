import { RiChatSmile2Line } from "@remixicon/react";
import { ConnectForm } from "#/components/auth/connect-form/connect-form";

export function ConnectScreen() {
	return (
		<main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--accent),transparent_60%)]" />
			<div className="relative flex w-full max-w-md flex-col items-center gap-6">
				<div className="flex flex-col items-center gap-3 text-center">
					<div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
						<RiChatSmile2Line className="size-6" />
					</div>
					<div className="space-y-1">
						<h1 className="text-3xl font-semibold tracking-tight">Avio</h1>
						<p className="text-sm text-muted-foreground">
							A calm, focused XMPP client.
						</p>
					</div>
				</div>
				<ConnectForm />
				<p className="max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
					Avio talks to your XMPP server directly. Your password is never stored
					in the browser.
				</p>
			</div>
		</main>
	);
}
