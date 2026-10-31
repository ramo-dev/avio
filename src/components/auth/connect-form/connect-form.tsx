import { RiArrowRightLine, RiSettings3Line } from "@remixicon/react";
import { Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
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
	const [optionsOpen, setOptionsOpen] = useState(false);

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

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!isValidAccountJid(jid.trim())) {
			toast.error("Enter a valid JID, for example you@example.com.");
			return;
		}

		if (!password) {
			toast.error("Enter your password.");
			return;
		}

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
		<form onSubmit={handleSubmit} className="flex flex-col gap-6">
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

			<Dialog open={optionsOpen} onOpenChange={setOptionsOpen}>
				<DialogTrigger
					render={
						<Button
							type="button"
							size="lg"
							variant="secondary"
							className="w-full text-muted-foreground hover:text-foreground"
							disabled={connecting}
						/>
					}
				>
					<RiSettings3Line data-icon="inline-start" />
					Connection options
				</DialogTrigger>

				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Connection options</DialogTitle>
						<DialogDescription>
							Configure custom endpoints if your XMPP server requires them.
							Leave these fields empty to use server discovery.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-5 py-2">
						<Field>
							<FieldLabel htmlFor="websocket">WebSocket URL</FieldLabel>
							<Input
								id="websocket"
								name="websocket"
								type="url"
								placeholder="wss://example.com/xmpp-websocket"
								value={websocketUrl}
								onChange={(event) => setWebsocketUrl(event.target.value)}
								disabled={connecting}
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="bosh">BOSH URL</FieldLabel>
							<Input
								id="bosh"
								name="bosh"
								type="url"
								placeholder="https://example.com/http-bind"
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
							<FieldDescription>
								Optional identifier for this client session.
							</FieldDescription>
						</Field>
					</div>

					<Button
						type="button"
						className="w-full"
						onClick={() => setOptionsOpen(false)}
					>
						Done
					</Button>
				</DialogContent>
			</Dialog>

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
	);
}
