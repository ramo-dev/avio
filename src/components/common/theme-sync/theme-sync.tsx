import { useEffect } from "react";
import { useSettings } from "#/hooks/use-settings";
import { applyTheme } from "#/lib/settings/theme";

export function ThemeSync() {
	const theme = useSettings().appearance.theme;

	useEffect(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const update = () => applyTheme(theme, media.matches);

		update();
		if (theme !== "system") return;

		media.addEventListener("change", update);
		return () => media.removeEventListener("change", update);
	}, [theme]);

	return null;
}
