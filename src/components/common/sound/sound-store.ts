import { useSyncExternalStore } from "react";

const STORAGE_KEY = "avio-sound-muted";
const VOLUME_KEY = "avio-sound-volume";
const DEFAULT_VOLUME = 0.5;

const listeners = new Set<() => void>();

function subscribeMuted(onChange: () => void) {
	listeners.add(onChange);
	window.addEventListener("storage", onChange);
	return () => {
		listeners.delete(onChange);
		window.removeEventListener("storage", onChange);
	};
}

function notify() {
	for (const onChange of listeners) onChange();
}

export function setSoundMuted(muted: boolean) {
	localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
	notify();
}

export function useSoundMuted() {
	return useSyncExternalStore(
		subscribeMuted,
		() => localStorage.getItem(STORAGE_KEY) === "1",
		() => false,
	);
}

export function setSoundVolume(volume: number) {
	localStorage.setItem(VOLUME_KEY, String(volume));
	notify();
}

export function useSoundVolume() {
	return useSyncExternalStore(
		subscribeMuted,
		() => {
			const raw = localStorage.getItem(VOLUME_KEY);
			if (raw === null) return DEFAULT_VOLUME;

			const stored = Number(raw);
			return Number.isFinite(stored) && stored >= 0 && stored <= 1
				? stored
				: DEFAULT_VOLUME;
		},
		() => DEFAULT_VOLUME,
	);
}

export { STORAGE_KEY, VOLUME_KEY, DEFAULT_VOLUME };
