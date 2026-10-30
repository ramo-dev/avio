import { useRouter, useRouterState } from "@tanstack/react-router";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
} from "react";
import { ContactInfoPanel } from "#/components/chat/conversation/header/contact-info-panel/contact-info-panel";
import { RoomInfoPanel } from "#/components/chat/conversation/header/room-info-panel/room-info-panel";
import { useXmppState } from "#/hooks/xmpp/use-xmpp";
import {
	encodeSidePanelParam,
	parseSidePanelParam,
	SIDE_PANEL_PARAM,
	sidePanelMeta,
} from "#/lib/side-panel-selection";
import type { SidePanelSelection } from "#/types/side-panel";

export interface RightSidebarPanel {
	title: string;
	description?: string;
	content: ReactNode;
}

interface RightSidebarContextValue {
	panel: RightSidebarPanel | null;
	open: (selection: SidePanelSelection) => void;
	close: () => void;
}

const RightSidebarContext = createContext<RightSidebarContextValue | null>(
	null,
);

type LocationSearch = Record<string, string | string[] | undefined>;

function readPanelParam(search: unknown): unknown {
	if (typeof search !== "object" || search === null || Array.isArray(search)) {
		return undefined;
	}
	const value = (search as LocationSearch)[SIDE_PANEL_PARAM];
	return Array.isArray(value) ? value[0] : value;
}

/**
 * Panel state lives in the `panel` search param of the current chat route, so a
 * refresh restores the info panel for the selected conversation.
 */
export function RightSidebarProvider({ children }: { children: ReactNode }) {
	const router = useRouter();
	const search = useRouterState({
		select: (state) => state.location.search,
	});
	const state = useXmppState();

	// Router-level navigate unions search schemas across routes and collapses to
	// `never` because some /chat routes have no validator. The provider is
	// route-agnostic, so the object is built here and revalidated on read by
	// `parseSidePanelParam`.
	const navigateWithPanelSearch = useCallback(
		(search: Partial<Record<typeof SIDE_PANEL_PARAM, string | undefined>>) => {
			void router.navigate({
				replace: true,
				search,
			} as Parameters<typeof router.navigate>[0]);
		},
		[router],
	);

	const open = useCallback(
		(selection: SidePanelSelection) => {
			navigateWithPanelSearch({
				[SIDE_PANEL_PARAM]: encodeSidePanelParam(selection),
			});
		},
		[navigateWithPanelSearch],
	);

	const close = useCallback(() => {
		navigateWithPanelSearch({});
	}, [navigateWithPanelSearch]);

	const panel = useMemo<RightSidebarPanel | null>(() => {
		const selection = parseSidePanelParam(readPanelParam(search));
		if (!selection) return null;
		return {
			...sidePanelMeta(selection, state),
			content:
				selection.kind === "contact" ? (
					<ContactInfoPanel jid={selection.jid} />
				) : (
					<RoomInfoPanel jid={selection.jid} />
				),
		};
	}, [search, state]);

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
