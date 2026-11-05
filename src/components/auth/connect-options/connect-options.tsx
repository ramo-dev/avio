import { RiSettings3Line } from "@remixicon/react";
import { useState } from "react";
import { ConnectDiscovery } from "#/components/auth/connect-discovery/connect-discovery";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";

export interface ConnectOptionsValue {
	host: string;
	port: string;
	websocketUrl: string;
	boshUrl: string;
	resource: string;
}

export function ConnectOptions({
	jid,
	value,
	onChange,
	onSelectEndpoint,
	disabled,
}: {
	jid: string;
	value: ConnectOptionsValue;
	onChange: (patch: Partial<ConnectOptionsValue>) => void;
	onSelectEndpoint: (endpoint: { websocket?: string; bosh?: string }) => void;
	disabled?: boolean;
}) {
	const [open, setOpen] = useState(false);

	function updateWebsocket(websocketUrl: string) {
		onChange({
			websocketUrl,
			...(websocketUrl ? { boshUrl: "" } : {}),
		});
	}

	function updateBosh(boshUrl: string) {
		onChange({
			boshUrl,
			...(boshUrl ? { websocketUrl: "" } : {}),
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button
						type="button"
						size="lg"
						variant="secondary"
						className="w-full text-muted-foreground hover:text-foreground"
						disabled={disabled}
					/>
				}
			>
				<RiSettings3Line data-icon="inline-start" />
				Connection options
			</DialogTrigger>

			<DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
				<DialogHeader className="border-b border-border px-6 py-4">
					<DialogTitle>Connection options</DialogTitle>
					<DialogDescription>
						Most servers publish their WebSocket or BOSH endpoint. Use this
						panel when discovery cannot find one.
					</DialogDescription>
				</DialogHeader>

				<div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
					<section className="flex min-h-0 flex-col gap-5 overflow-y-auto p-6">
						<div className="grid gap-3 sm:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="host">Host (optional)</FieldLabel>
								<Input
									id="host"
									name="host"
									type="text"
									placeholder="chat.example.com"
									value={value.host}
									onChange={(event) => onChange({ host: event.target.value })}
									disabled={disabled}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="port">Port (optional)</FieldLabel>
								<Input
									id="port"
									name="port"
									type="number"
									min={1}
									max={65535}
									placeholder="443"
									value={value.port}
									onChange={(event) => onChange({ port: event.target.value })}
									disabled={disabled}
								/>
								<FieldDescription>
									WebSocket/BOSH port, not XMPP TCP 5222.
								</FieldDescription>
							</Field>
						</div>

						<Field>
							<FieldLabel htmlFor="websocket">WebSocket URL</FieldLabel>
							<Input
								id="websocket"
								name="websocket"
								type="url"
								placeholder="wss://example.com/xmpp-websocket"
								value={value.websocketUrl}
								onChange={(event) => updateWebsocket(event.target.value)}
								disabled={disabled}
							/>
							<FieldDescription>
								Use wss:// for remote servers. ws:// only works on localhost.
							</FieldDescription>
						</Field>

						<Field>
							<FieldLabel htmlFor="bosh">BOSH URL</FieldLabel>
							<Input
								id="bosh"
								name="bosh"
								type="url"
								placeholder="https://example.com/http-bind"
								value={value.boshUrl}
								onChange={(event) => updateBosh(event.target.value)}
								disabled={disabled}
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="resource">Resource</FieldLabel>
							<Input
								id="resource"
								name="resource"
								type="text"
								placeholder="avio-web"
								value={value.resource}
								onChange={(event) => onChange({ resource: event.target.value })}
								disabled={disabled}
							/>
							<FieldDescription>
								Optional identifier for this client session.
							</FieldDescription>
						</Field>
					</section>

					<aside className="min-h-0 overflow-y-auto border-t border-border bg-muted/40 p-6 md:border-t-0 md:border-l">
						<ConnectDiscovery
							jid={jid}
							host={value.host.trim() || undefined}
							port={
								Number.isFinite(Number.parseInt(value.port, 10))
									? Number.parseInt(value.port, 10)
									: undefined
							}
							websocketUrl={value.websocketUrl}
							boshUrl={value.boshUrl}
							disabled={disabled}
							onUse={onSelectEndpoint}
						/>
					</aside>
				</div>

				<DialogFooter className="flex-row items-center justify-between gap-3 border-t border-border bg-muted/40 px-6 py-4 sm:justify-between">
					<p className="text-xs text-muted-foreground">
						Avio connects directly to your server. Credentials never pass
						through an Avio server.
					</p>
					<Button type="button" onClick={() => setOpen(false)}>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
