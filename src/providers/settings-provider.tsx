import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";

interface SettingsContextValue {
	open: boolean;
	setOpen: (open: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const value = useMemo(() => ({ open, setOpen }), [open]);

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
