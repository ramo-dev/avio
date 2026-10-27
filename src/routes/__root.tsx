import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { AppToaster } from "#/components/common/app-toaster/app-toaster";
import { XmppErrorToaster } from "#/components/common/xmpp-error-toaster/xmpp-error-toaster";
import { TooltipProvider } from "#/components/ui/tooltip";
import { XmppProvider } from "#/providers/xmpp-provider";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Avio",
			},
			{
				name: "description",
				content: "A calm, focused XMPP client for the web.",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<div className="root min-h-svh">
					<TooltipProvider>
						<XmppProvider>
							{children}
							<XmppErrorToaster />
						</XmppProvider>
					</TooltipProvider>
					<AppToaster />
				</div>
				{import.meta.env.DEV && (
					<TanStackDevtools
						config={{
							position: "bottom-right",
							triggerHidden: true,
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
							TanStackQueryDevtools,
						]}
					/>
				)}
				<Scripts />
			</body>
		</html>
	);
}
