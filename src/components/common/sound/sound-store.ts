import { useSettings } from "#/hooks/use-settings";
import {
	DEFAULT_SETTINGS,
	setSoundMuted as setStoredSoundMuted,
	setSoundVolume as setStoredSoundVolume,
} from "#/lib/settings/preferences";

export const DEFAULT_VOLUME = DEFAULT_SETTINGS.sounds.volume;

export function setSoundMuted(muted: boolean) {
	setStoredSoundMuted(muted);
}

export function useSoundMuted() {
	return useSettings().sounds.muted;
}

export function setSoundVolume(volume: number) {
	setStoredSoundVolume(volume);
}

export function useSoundVolume() {
	return useSettings().sounds.volume;
}
