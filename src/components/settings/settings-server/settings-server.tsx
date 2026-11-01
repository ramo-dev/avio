import { RiRefreshLine } from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";
import { SettingsSection } from "#/components/settings/settings-section/settings-section";
import { Button } from "#/components/ui/button";
import { useXmppActions } from "#/hooks/xmpp/use-xmpp";
import {
	buildServerServiceViews,
	groupServerServices,
	SERVER_STATUS_META,
	summarizeServerServices,
} from "#/lib/xmpp/server-capability-view";
import type { ServerCapabilities } from "#/types/server-capabilities";
import { ServiceGroup, ServiceRow } from "./service-row";
import { SummaryStat } from "./status-bits";

/** Live server capability detection grouped by security status. */
export function SettingsServer() {
	const actions = useXmppActions();
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [capabilities, setCapabilities] = useState<ServerCapabilities | null>(
		null,
	);

	const load = useCallback(
		async ({ isRefresh }: { isRefresh: boolean }) => {
			setError(null);
			if (isRefresh) setRefreshing(true);
			else setLoading(true);
			try {
				setCapabilities(await actions.getServerCapabilities());
			} catch (cause) {
				setError(
					cause instanceof Error
						? cause.message
						: "Could not query server capabilities.",
				);
			} finally {
				setLoading(false);
				setRefreshing(false);
			}
		},
		[actions],
	);

	useEffect(() => {
		void load({ isRefresh: false });
	}, [load]);

	const services = capabilities ? buildServerServiceViews(capabilities) : [];
	const groups = groupServerServices(services);
	const summary = summarizeServerServices(services);

	return (
		<SettingsSection
			title="Server"
			description="Capabilities detected from your XMPP server."
		>
			<div className="space-y-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					{error ? (
						<p className="text-sm text-destructive">{error}</p>
					) : (
						<p className="text-sm text-muted-foreground">
							Capabilities detected from your XMPP server.
						</p>
					)}
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="self-start"
						disabled={refreshing || loading}
						onClick={() => void load({ isRefresh: true })}
					>
						<RiRefreshLine
							className={refreshing ? "size-4 animate-spin" : "size-4"}
						/>
						Refresh
					</Button>
				</div>

				{loading && !capabilities && (
					<p className="text-sm text-muted-foreground">Detecting…</p>
				)}

				{capabilities && (
					<>
						<div className="grid grid-cols-3 gap-3">
							<SummaryStat
								status="attention"
								label="Attention"
								value={summary.attention}
							/>
							<SummaryStat
								status="upcoming"
								label="Upcoming"
								value={summary.upcoming}
							/>
							<SummaryStat
								status="active"
								label="Active"
								value={summary.active}
							/>
						</div>

						{groups.map((group) => {
							const meta = SERVER_STATUS_META[group.status];
							return (
								<section key={group.status} className="space-y-3">
									<ServiceGroup
										title={meta.title}
										hint={meta.hint}
										count={group.items.length}
									/>
									<ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
										{group.items.map((service) => (
											<ServiceRow key={service.id} service={service} />
										))}
									</ul>
								</section>
							);
						})}
					</>
				)}
			</div>
		</SettingsSection>
	);
}
