import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { IconRail } from "#/components/layout/icon-rail/icon-rail";
import { RightSidebarCard } from "#/components/layout/right-sidebar/right-sidebar-card/right-sidebar-card";
import { RightSidebarDrawer } from "#/components/layout/right-sidebar/right-sidebar-drawer/right-sidebar-drawer";
import { SettingsHost } from "#/components/settings/settings-host/settings-host";
import { useMediaQuery } from "#/hooks/use-media-query";
import {
	RightSidebarProvider,
	useRightSidebar,
} from "#/providers/right-sidebar-provider";
import { SettingsProvider } from "#/providers/settings-provider";

export function ChatShell({
	children,
	showRail = true,
}: {
	children: React.ReactNode;
	showRail?: boolean;
}) {
	return (
		<SettingsProvider>
			<RightSidebarProvider>
				<ChatShellFrame showRail={showRail}>{children}</ChatShellFrame>
				<SettingsHost />
			</RightSidebarProvider>
		</SettingsProvider>
	);
}

function ChatShellFrame({
	children,
	showRail,
}: {
	children: React.ReactNode;
	showRail: boolean;
}) {
	const { close } = useRightSidebar();
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const desktopSidebar = useMediaQuery("(min-width: 1024px)");
	// The panel is URL-backed, so the first render may be a refresh restoring a
	// panel. Close only when the pathname actually changes (conversation switch).
	const previousPathname = useRef<string | null>(null);

	useEffect(() => {
		if (previousPathname.current === null) {
			previousPathname.current = pathname;
			return;
		}
		if (previousPathname.current !== pathname) {
			close();
		}
		previousPathname.current = pathname;
	}, [close, pathname]);

	return (
		<div className="h-dvh w-full overflow-hidden bg-accent/20 md:p-2">
			<div className="mx-auto flex h-full w-full max-w-[1600px] overflow-hidden">
				<div className="flex min-w-0 flex-1 overflow-hidden md:rounded-lg md:border border-border bg-card">
					{showRail && <IconRail onAction={close} />}
					<div className="flex min-w-0 flex-1 overflow-hidden">{children}</div>
				</div>
				{desktopSidebar ? <RightSidebarCard /> : null}
			</div>
			{!desktopSidebar ? <RightSidebarDrawer /> : null}
		</div>
	);
}
