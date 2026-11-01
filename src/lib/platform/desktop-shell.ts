/**
 * True when the app runs inside the Tauri desktop shell. Checked at call time so
 * server rendering never touches `window`.
 */
export function isDesktopShell(): boolean {
	return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
