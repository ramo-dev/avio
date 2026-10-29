import { describe, expect, it, vi } from "vitest";
import type { SettingsStorage } from "#/lib/settings/preferences";
import {
	createSettingsStore,
	DEFAULT_SETTINGS,
	normalizeSettings,
	SETTINGS_STORAGE_KEY,
} from "#/lib/settings/preferences";

function createMemoryStorage(initial: Record<string, string> = {}) {
	const values = new Map(Object.entries(initial));

	const storage: SettingsStorage = {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => {
			values.set(key, value);
		},
		removeItem: (key) => {
			values.delete(key);
		},
	};

	return { storage, values };
}

describe("settings preferences", () => {
	it("returns defaults when nothing is stored", () => {
		const { storage } = createMemoryStorage();
		const store = createSettingsStore(storage);

		expect(store.get()).toEqual(DEFAULT_SETTINGS);
	});

	it("merges partial values over the defaults", () => {
		const { storage } = createMemoryStorage({
			[SETTINGS_STORAGE_KEY]: JSON.stringify({
				appearance: { theme: "dark" },
				chats: { enterToSend: false },
			}),
		});
		const store = createSettingsStore(storage);

		expect(store.get()).toEqual({
			...DEFAULT_SETTINGS,
			appearance: { theme: "dark" },
			chats: { ...DEFAULT_SETTINGS.chats, enterToSend: false },
		});
	});

	it("normalizes invalid and out-of-range values", () => {
		const settings = normalizeSettings({
			version: 99,
			appearance: { theme: "sepia" },
			sounds: { muted: "yes", volume: 4 },
			chats: { typingIndicators: "off" },
		});

		expect(settings.version).toBe(1);
		expect(settings.appearance.theme).toBe("system");
		expect(settings.sounds).toEqual({ muted: false, volume: 1 });
		expect(settings.chats.typingIndicators).toBe(true);
	});

	it("migrates the legacy sound keys once", () => {
		const { storage, values } = createMemoryStorage({
			"avio-sound-muted": "1",
			"avio-sound-volume": "0.25",
		});
		const store = createSettingsStore(storage);

		expect(store.get().sounds).toEqual({ muted: true, volume: 0.25 });
		expect(values.get("avio-sound-muted")).toBeUndefined();
		expect(values.get("avio-sound-volume")).toBeUndefined();
		expect(values.get(SETTINGS_STORAGE_KEY)).toBeTruthy();
	});

	it("falls back to defaults for corrupted storage", () => {
		const { storage } = createMemoryStorage({
			[SETTINGS_STORAGE_KEY]: "{not json",
		});

		expect(createSettingsStore(storage).get()).toEqual(DEFAULT_SETTINGS);
	});

	it("persists updates and notifies subscribers", () => {
		const { storage, values } = createMemoryStorage();
		const store = createSettingsStore(storage);
		const listener = vi.fn();
		const unsubscribe = store.subscribe(listener);

		store.update((current) => ({
			...current,
			appearance: { theme: "light" },
		}));

		expect(store.get().appearance.theme).toBe("light");
		expect(listener).toHaveBeenCalledTimes(1);
		expect(JSON.parse(values.get(SETTINGS_STORAGE_KEY) ?? "{}")).toMatchObject({
			appearance: { theme: "light" },
		});

		unsubscribe();
		store.update((current) => ({
			...current,
			appearance: { theme: "dark" },
		}));
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("keeps the in-memory value when storage writes fail", () => {
		const storage: SettingsStorage = {
			getItem: () => null,
			setItem: () => {
				throw new Error("quota");
			},
			removeItem: () => undefined,
		};
		const store = createSettingsStore(storage);

		store.update((current) => ({
			...current,
			sounds: { ...current.sounds, muted: true },
		}));

		expect(store.get().sounds.muted).toBe(true);
	});
});
