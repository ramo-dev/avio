import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

export interface RightSidebarPanel {
	title: string;
	description?: string;
	content: ReactNode;
}

interface RightSidebarContextValue {
	panel: RightSidebarPanel | null;
	open: (panel: RightSidebarPanel) => void;
	close: () => void;
}

const RightSidebarContext = createContext<RightSidebarContextValue | null>(
	null,
);

export function RightSidebarProvider({ children }: { children: ReactNode }) {
	const [panel, setPanel] = useState<RightSidebarPanel | null>(null);

	const open = useCallback((next: RightSidebarPanel) => {
		setPanel(next);
	}, []);

	const close = useCallback(() => {
		setPanel(null);
	}, []);

	const value = useMemo(() => ({ panel, open, close }), [panel, open, close]);

	return (
		<RightSidebarContext.Provider value={value}>
			{children}
		</RightSidebarContext.Provider>
	);
}

export function useRightSidebar(): RightSidebarContextValue {
	const context = useContext(RightSidebarContext);
	if (!context) {
		throw new Error("useRightSidebar must be used inside RightSidebarProvider");
	}
	return context;
}
