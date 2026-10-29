import type { Settings, ThemePreference } from "#/types/settings";

export const SETTINGS_STORAGE_KEY = "avio.settings.v1";
export const SETTINGS_VERSION = 1;

const LEGACY_MUTED_KEY = "avio-sound-muted";
const LEGACY_VOLUME_KEY = "avio-sound-volume";

export const DEFAULT_SETTINGS: Settings = {
	version: SETTINGS_VERSION,
	appearance: { theme: "system" },
	sounds: { muted: false, volume: 0.5 },
	chats: { enterToSend: true, typingIndicators: true },
};

export interface SettingsStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

export interface SettingsStore {
	get(): Settings;
	subscribe(listener: () => void): () => void;
	update(updater: (current: Settings) => Settings): void;
}

interface SettingsStoreOptions {
	syncTabs?: boolean;
}

export function createSettingsStore(
	storage: SettingsStorage | null,
	options: SettingsStoreOptions = {},
): SettingsStore {
	let cached: Settings | null = null;
	const listeners = new Set<() => void>();
	let storageBound = false;

	function read(): Settings {
		if (!storage) return DEFAULT_SETTINGS;

		try {
			const raw = storage.getItem(SETTINGS_STORAGE_KEY);
			if (raw !== null) return parseSettings(raw);

			const legacy = migrateLegacy(storage);
			if (!legacy) return DEFAULT_SETTINGS;

			storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(legacy));
			storage.removeItem(LEGACY_MUTED_KEY);
			storage.removeItem(LEGACY_VOLUME_KEY);
			return legacy;
		} catch {
			return DEFAULT_SETTINGS;
		}
	}

	function get(): Settings {
		cached ??= read();
		return cached;
	}

	function notify() {
		for (const listener of listeners) listener();
	}

	function onStorage(event: StorageEvent) {
		if (event.key !== SETTINGS_STORAGE_KEY && event.key !== null) return;
		cached = read();
		notify();
	}

	function update(updater: (current: Settings) => Settings) {
		const next = normalizeSettings(updater(get()));
		cached = next;
		if (storage) {
			try {
				storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
			} catch {
				// Private browsing and quota errors keep the in-memory value.
			}
		}
		notify();
	}

	function subscribe(listener: () => void) {
		listeners.add(listener);
		if (options.syncTabs && typeof window !== "undefined" && !storageBound) {
			storageBound = true;
			window.addEventListener("storage", onStorage);
		}
		return () => {
			listeners.delete(listener);
		};
	}

	return { get, subscribe, update };
}

export function normalizeSettings(value: unknown): Settings {
	const root = asRecord(value);
	const appearance = asRecord(root?.appearance);
	const sounds = asRecord(root?.sounds);
	const chats = asRecord(root?.chats);

	return {
		version: SETTINGS_VERSION,
		appearance: {
			theme: asTheme(appearance?.theme),
		},
		sounds: {
			muted: asBoolean(sounds?.muted, DEFAULT_SETTINGS.sounds.muted),
			volume: asVolume(sounds?.volume),
		},
		chats: {
			enterToSend: asBoolean(
				chats?.enterToSend,
				DEFAULT_SETTINGS.chats.enterToSend,
			),
			typingIndicators: asBoolean(
				chats?.typingIndicators,
				DEFAULT_SETTINGS.chats.typingIndicators,
			),
		},
	};
}

function parseSettings(raw: string): Settings {
	try {
		return normalizeSettings(JSON.parse(raw));
	} catch {
		return DEFAULT_SETTINGS;
	}
}

function migrateLegacy(storage: SettingsStorage): Settings | null {
	const muted = storage.getItem(LEGACY_MUTED_KEY);
	const volume = storage.getItem(LEGACY_VOLUME_KEY);
	if (muted === null && volume === null) return null;

	return {
		...DEFAULT_SETTINGS,
		sounds: {
			muted: muted === "1",
			volume: asVolume(volume),
		},
	};
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function asTheme(value: unknown): ThemePreference {
	return value === "light" || value === "dark" || value === "system"
		? value
		: DEFAULT_SETTINGS.appearance.theme;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function asVolume(value: unknown): number {
	const numeric =
		typeof value === "number"
			? value
			: typeof value === "string" && value.trim().length > 0
				? Number(value)
				: Number.NaN;
	if (!Number.isFinite(numeric)) return DEFAULT_SETTINGS.sounds.volume;
	return Math.min(1, Math.max(0, numeric));
}

function getBrowserStorage(): SettingsStorage | null {
	if (typeof window === "undefined") return null;
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

export const settingsStore = createSettingsStore(getBrowserStorage(), {
	syncTabs: true,
});

export function setTheme(theme: ThemePreference) {
	settingsStore.update((current) => ({
		...current,
		appearance: { ...current.appearance, theme },
	}));
}

export function setSoundMuted(muted: boolean) {
	settingsStore.update((current) => ({
		...current,
		sounds: { ...current.sounds, muted },
	}));
}

export function setSoundVolume(volume: number) {
	settingsStore.update((current) => ({
		...current,
		sounds: { ...current.sounds, volume },
	}));
}

export function setEnterToSend(enterToSend: boolean) {
	settingsStore.update((current) => ({
		...current,
		chats: { ...current.chats, enterToSend },
	}));
}

export function setTypingIndicators(typingIndicators: boolean) {
	settingsStore.update((current) => ({
		...current,
		chats: { ...current.chats, typingIndicators },
	}));
}
