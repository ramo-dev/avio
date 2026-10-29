export type ThemePreference = "system" | "light" | "dark";

export interface AppearanceSettings {
	theme: ThemePreference;
}

export interface SoundSettings {
	muted: boolean;
	volume: number;
}

export interface ChatSettings {
	enterToSend: boolean;
	typingIndicators: boolean;
}

export interface NotificationSettings {
	enabled: boolean;
	previews: boolean;
}

export interface Settings {
	version: 1;
	appearance: AppearanceSettings;
	sounds: SoundSettings;
	chats: ChatSettings;
	notifications: NotificationSettings;
}
