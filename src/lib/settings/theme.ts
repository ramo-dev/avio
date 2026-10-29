import { SETTINGS_STORAGE_KEY } from "#/lib/settings/preferences";
import type { ThemePreference } from "#/types/settings";

export type ResolvedTheme = "light" | "dark";

export function resolveTheme(
	theme: ThemePreference,
	prefersDark: boolean,
): ResolvedTheme {
	if (theme === "light") return "light";
	if (theme === "dark") return "dark";
	return prefersDark ? "dark" : "light";
}

export function applyTheme(theme: ThemePreference, prefersDark: boolean) {
	if (typeof document === "undefined") return;

	const resolved = resolveTheme(theme, prefersDark);
	document.documentElement.classList.toggle("dark", resolved === "dark");
	document.documentElement.style.colorScheme = resolved;
}

export const THEME_INIT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
	SETTINGS_STORAGE_KEY,
)})||"null");var t=s&&s.appearance&&s.appearance.theme;var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
