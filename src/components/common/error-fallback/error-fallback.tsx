import { RiAlertLine, RiRefreshLine } from "@remixicon/react";
import { Logo } from "#/assets/logo/Logo";
import { Button } from "#/components/ui/button";

interface ErrorFallbackProps {
	error?: unknown;
	onRetry?: () => void;
}

/**
 * Shared branded fallback for render errors and route failures.
 *
 * Stack details are only shown in development; production gets a short,
 * actionable message without exposing internal state.
 */
export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
	const message =
		error instanceof Error && import.meta.env.DEV
			? error.message
			: "Something unexpected interrupted Avio.";

	function reload() {
		window.location.reload();
	}

	return (
		<main className="grid min-h-svh place-items-center bg-background px-4 py-12 text-foreground">
			<div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
				<div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border bg-muted/60">
					<Logo className="size-8" />
				</div>

				<div className="mt-5 flex items-center justify-center gap-2 text-muted-foreground">
					<RiAlertLine className="size-4" />
					<span className="text-xs font-medium uppercase tracking-wide">
						Something went wrong
					</span>
				</div>

				<h1 className="mt-2 text-xl font-semibold tracking-tight">
					Avio hit a snag
				</h1>
				<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
					{message} Your conversations are still on your server. Try again, or
					reload the app if the problem continues.
				</p>

				{import.meta.env.DEV && error instanceof Error && error.stack && (
					<details className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-left">
						<summary className="cursor-pointer text-xs font-medium text-muted-foreground">
							Development details
						</summary>
						<pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">
							{error.stack}
						</pre>
					</details>
				)}

				<div className="mt-6 flex flex-wrap justify-center gap-2">
					{onRetry && (
						<Button type="button" onClick={onRetry}>
							<RiRefreshLine />
							Try again
						</Button>
					)}
					<Button type="button" variant="outline" onClick={reload}>
						Reload Avio
					</Button>
				</div>
			</div>
		</main>
	);
}
