import { ConnectForm } from "#/components/auth/connect-form/connect-form";

export function ConnectScreen() {
	return (
		<main className="grid max-h-screen overflow-hidden bg-background lg:grid-cols-2">
			<section className="relative m-3 rounded-md hidden h-full lg:block overflow-hidden">
				<img
					src="https://images.pexels.com/photos/10049469/pexels-photo-10049469.jpeg"
					alt="Avio"
					className="absolute mb-3 inset-0 h-full w-full object-cover"
				/>
				<div className="absolute inset-0 top-0 h-full bg-gradient-to-b from-transparent to-black" />
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
