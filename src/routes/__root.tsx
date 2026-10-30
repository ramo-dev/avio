import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { AppToaster } from "#/components/common/app-toaster/app-toaster";
import { AppErrorBoundary } from "#/components/common/error-boundary/error-boundary";
import { ErrorFallback } from "#/components/common/error-fallback/error-fallback";
import { NotificationBridge } from "#/components/common/notification-bridge/notification-bridge";
import { SoundEffects } from "#/components/common/sound/sound";
import { ThemeSync } from "#/components/common/theme-sync/theme-sync";
import { XmppErrorToaster } from "#/components/common/xmpp-error-toaster/xmpp-error-toaster";
import { TooltipProvider } from "#/components/ui/tooltip";
import { THEME_INIT_SCRIPT } from "#/lib/settings/theme";
import { OmemoProvider } from "#/providers/omemo-provider";
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
			{
				name: "color-scheme",
				content: "light dark",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	errorComponent: ({ error, reset }) => (
		<ErrorFallback error={error} onRetry={reset} />
	),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				<script>{THEME_INIT_SCRIPT}</script>
			</head>
			<body>
				<div className="root min-h-svh">
					<AppErrorBoundary>
						<ThemeSync />
						<TooltipProvider>
							<SoundEffects>
								<XmppProvider>
									<OmemoProvider>
										{children}
										<NotificationBridge />
										<XmppErrorToaster />
									</OmemoProvider>
								</XmppProvider>
							</SoundEffects>
						</TooltipProvider>
					</AppErrorBoundary>
				</div>
				<AppToaster />
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
