import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import type { SettingsSectionId } from "#/components/settings/settings-nav/settings-nav";

/** Deep link into Settings with an optional anchor inside a section. */
export interface SettingsTarget {
	section: SettingsSectionId;
	anchor?: "omemo";
}

interface SettingsContextValue {
	open: boolean;
	setOpen: (open: boolean) => void;
	target: SettingsTarget | null;
	openSettings: (target?: SettingsTarget) => void;
	clearTarget: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const [target, setTarget] = useState<SettingsTarget | null>(null);

	const openSettings = useCallback((next?: SettingsTarget) => {
		setOpen(true);
		setTarget(next ?? null);
	}, []);

	const clearTarget = useCallback(() => {
		setTarget(null);
	}, []);

	const value = useMemo(
		() => ({ open, setOpen, target, openSettings, clearTarget }),
		[open, target, openSettings, clearTarget],
	);

	return (
		<SettingsContext.Provider value={value}>
			{children}
		</SettingsContext.Provider>
	);
}

export function useSettings(): SettingsContextValue {
	const context = useContext(SettingsContext);
	if (!context) {
		throw new Error("useSettings must be used inside SettingsProvider");
	}
	return context;
}
