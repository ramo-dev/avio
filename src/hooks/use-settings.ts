import { useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS, settingsStore } from "#/lib/settings/preferences";
import type { Settings } from "#/types/settings";

const getServerSnapshot = () => DEFAULT_SETTINGS;

export function useSettings(): Settings {
	return useSyncExternalStore(
		settingsStore.subscribe,
		settingsStore.get,
		getServerSnapshot,
	);
}
