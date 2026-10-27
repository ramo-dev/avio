import { RiArrowRightLine, RiSettings3Line } from "@remixicon/react";
import { Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Spinner } from "#/components/ui/spinner";
import { useXmppActions, useXmppState } from "#/hooks/xmpp/use-xmpp";
import { createSessionStore } from "#/lib/storage/session";
import { isValidAccountJid } from "#/lib/xmpp/jid";

export function ConnectForm() {
	const state = useXmppState();
	const actions = useXmppActions();
	const [sessionStore] = useState(() => createSessionStore());
	const [jid, setJid] = useState("");
	const [password, setPassword] = useState("");
	const [websocketUrl, setWebsocketUrl] = useState("");
	const [boshUrl, setBoshUrl] = useState("");
	const [resource, setResource] = useState("");
	const [advanced, setAdvanced] = useState(false);
	const [localError, setLocalError] = useState<string | null>(null);

	useEffect(() => {
		const saved = sessionStore.load();
		if (!saved) return;
		setJid((value) => value || saved.jid);
		setWebsocketUrl((value) => value || saved.websocketUrl || "");
		setBoshUrl((value) => value || saved.boshUrl || "");
		setResource((value) => value || saved.resource || "");
	}, [sessionStore]);

	if (state.connection.status === "connected") {
		return <Navigate to="/chat" />;
	}

	const connecting = state.connection.status === "connecting";
	const error = localError ?? state.connection.error?.message;

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!isValidAccountJid(jid.trim())) {
			setLocalError("Enter a valid JID, for example you@example.com.");
			return;
		}
		if (!password) {
			setLocalError("Enter your password.");
			return;
		}
		setLocalError(null);
		actions.clearError();
		void actions.connect({
			jid: jid.trim(),
			password,
			websocketUrl: websocketUrl.trim() || undefined,
			boshUrl: boshUrl.trim() || undefined,
			resource: resource.trim() || undefined,
		});
	}

	return (
		<Card className="w-full max-w-md shadow-sm">
			<CardHeader>
				<CardTitle className="text-2xl">Connect to XMPP</CardTitle>
				<CardDescription>
					Use your XMPP account to start messaging. Avio connects directly from
					your browser.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="flex flex-col gap-5">
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="jid">JID</FieldLabel>
							<Input
								id="jid"
								name="jid"
								type="text"
								inputMode="email"
								autoComplete="username"
								placeholder="you@example.com"
								value={jid}
								onChange={(event) => setJid(event.target.value)}
								disabled={connecting}
								required
							/>
							<FieldDescription>
								Your full XMPP address, including the domain.
							</FieldDescription>
						</Field>
						<Field>
							<FieldLabel htmlFor="password">Password</FieldLabel>
							<Input
								id="password"
								name="password"
								type="password"
								autoComplete="current-password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								disabled={connecting}
								required
							/>
						</Field>
					</FieldGroup>

					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="self-start px-0 text-muted-foreground"
						onClick={() => setAdvanced((value) => !value)}
					>
						<RiSettings3Line data-icon="inline-start" />
						{advanced ? "Hide connection options" : "Connection options"}
					</Button>

					{advanced && (
						<div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-3">
							<Field>
								<FieldLabel htmlFor="websocket">WebSocket URL</FieldLabel>
								<Input
									id="websocket"
									name="websocket"
									type="url"
									placeholder="wss://example.com:5281/xmpp-websocket"
									value={websocketUrl}
									onChange={(event) => setWebsocketUrl(event.target.value)}
									disabled={connecting}
								/>
								<FieldDescription>
									Leave blank to use server discovery.
								</FieldDescription>
							</Field>
							<Field>
								<FieldLabel htmlFor="bosh">BOSH URL</FieldLabel>
								<Input
									id="bosh"
									name="bosh"
									type="url"
									placeholder="https://example.com:5281/http-bind"
									value={boshUrl}
									onChange={(event) => setBoshUrl(event.target.value)}
									disabled={connecting}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="resource">Resource</FieldLabel>
								<Input
									id="resource"
									name="resource"
									type="text"
									placeholder="avio-web"
									value={resource}
									onChange={(event) => setResource(event.target.value)}
									disabled={connecting}
								/>
							</Field>
						</div>
					)}

					{error && (
						<Alert variant="destructive">
							<AlertTitle>Could not connect</AlertTitle>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<Button type="submit" size="lg" disabled={connecting}>
						{connecting ? (
							<>
								<Spinner data-icon="inline-start" />
								Connecting
							</>
						) : (
							<>
								Connect
								<RiArrowRightLine data-icon="inline-end" />
							</>
						)}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
