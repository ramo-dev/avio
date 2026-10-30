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

export type DefaultEncryption = "none" | "omemo";

export interface SecuritySettings {
	defaultEncryption: DefaultEncryption;
	rememberOmemoUnlock: boolean;
}

export interface Settings {
	version: 1;
	appearance: AppearanceSettings;
	sounds: SoundSettings;
	chats: ChatSettings;
	notifications: NotificationSettings;
	security: SecuritySettings;
}
