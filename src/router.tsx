import {
	createHashHistory,
	createRouter as createTanStackRouter,
} from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { getContext } from "./integrations/tanstack-query/root-provider";
import { isDesktopShell } from "./lib/platform/desktop-shell";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const context = getContext();

	// The shell serves the bundle from a fixed origin with no server fallback, so a
	// reload on a path such as /chat/alice would 404. Hash history keeps every
	// route inside the one file the shell loads.
	const router = createTanStackRouter({
		routeTree,
		context,
		history: isDesktopShell() ? createHashHistory() : undefined,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});

	setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
