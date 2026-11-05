import { cn } from "cn";
import { useEffect, useState } from "react";
import { Logo } from "#/assets/logo/Logo";
import { useHydrated } from "#/hooks/use-hydrated";

type Phase = "visible" | "leaving" | "hidden";

/** Static-looking launch screen that disappears once React has hydrated. */
export function SplashScreen() {
	const hydrated = useHydrated();
	const [phase, setPhase] = useState<Phase>("visible");

	useEffect(() => {
		if (!hydrated) return;

		const frame = requestAnimationFrame(() => setPhase("leaving"));
		const timeout = window.setTimeout(() => setPhase("hidden"), 220);

		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(timeout);
		};
	}, [hydrated]);

	if (phase === "hidden") return null;

	return (
		<output
			aria-label="Loading Avio"
			aria-live="polite"
			className={cn("app-splash", phase === "leaving" && "app-splash-leaving")}
		>
			<Logo className="size-10" />
			<span aria-hidden="true" className="app-splash-bar" />
		</output>
	);
}
