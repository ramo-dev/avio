import { Logo } from "#/assets/logo/Logo";
import { ConnectForm } from "#/components/auth/connect-form/connect-form";
import { FloatingPaths } from "#/components/ui/floating-paths";

export function ConnectScreen() {
	return (
		<main className="grid max-h-screen overflow-hidden bg-background lg:grid-cols-2">
			<section className="relative m-3 border rounded-md hidden h-full lg:block overflow-hidden">
				<div className="p-4 flex gap-2 items-center">
					<Logo className="md:h-6.5 h-3.5" />
					<span className="font-bold text-xl md:text-4xl uppercase">Avio</span>
				</div>

				<div className="absolute inset-0">
					<FloatingPaths position={1} />
					<FloatingPaths position={-1} />
				</div>
			</section>

			<section className="flex min-h-svh flex-col items-center justify-center px-6 py-12">
				<div className="flex w-full max-w-sm flex-col gap-8">
					<header className="space-y-2">
						<h1 className="text-2xl font-semibold tracking-tight">
							Connect to Avio
						</h1>

						<p className="text-sm leading-relaxed text-muted-foreground">
							Connect your account to your XMPP server.
						</p>
					</header>

					<ConnectForm />

					<p className="text-center text-xs leading-relaxed text-muted-foreground">
						Your connection goes directly to your XMPP server. Your password is
						never stored in the browser.
					</p>
				</div>
			</section>
		</main>
	);
}
