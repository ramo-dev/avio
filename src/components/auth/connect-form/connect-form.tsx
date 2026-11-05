import { RiArrowRightLine } from "@remixicon/react";
import { Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
	ConnectOptions,
	type ConnectOptionsValue,
} from "#/components/auth/connect-options/connect-options";
import { Button } from "#/components/ui/button";
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

const EMPTY_OPTIONS: ConnectOptionsValue = {
	host: "",
	port: "",
	websocketUrl: "",
	boshUrl: "",
	resource: "",
};

export function ConnectForm() {
	const state = useXmppState();
	const actions = useXmppActions();

	const [sessionStore] = useState(() => createSessionStore());
	const [jid, setJid] = useState("");
	const [password, setPassword] = useState("");
	const [options, setOptions] = useState(EMPTY_OPTIONS);

	useEffect(() => {
		const saved = sessionStore.load();
		if (!saved) return;

		setJid((value) => value || saved.jid);
		setOptions((value) => ({
			host: value.host || saved.host || "",
			port: value.port || (saved.port ? String(saved.port) : ""),
			websocketUrl: value.websocketUrl || saved.websocketUrl || "",
			boshUrl: value.boshUrl || saved.boshUrl || "",
			resource: value.resource || saved.resource || "",
		}));
	}, [sessionStore]);

	if (state.connection.status === "connected") {
		return <Navigate to="/chat" />;
	}

	const connecting = state.connection.status === "connecting";

	function updateOptions(patch: Partial<ConnectOptionsValue>) {
		setOptions((current) => ({ ...current, ...patch }));
	}

	function selectEndpoint(endpoint: { websocket?: string; bosh?: string }) {
		if (endpoint.websocket !== undefined) {
			updateOptions({ websocketUrl: endpoint.websocket, boshUrl: "" });
		}
		if (endpoint.bosh !== undefined) {
			updateOptions({ boshUrl: endpoint.bosh, websocketUrl: "" });
		}
	}

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

		const parsedPort = Number.parseInt(options.port, 10);
		actions.clearError();

		void actions.connect({
			jid: jid.trim(),
			password,
			websocketUrl: options.websocketUrl.trim() || undefined,
			boshUrl: options.boshUrl.trim() || undefined,
			host: options.host.trim() || undefined,
			port: Number.isFinite(parsedPort) ? parsedPort : undefined,
			resource: options.resource.trim() || undefined,
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

			<ConnectOptions
				jid={jid}
				value={options}
				onChange={updateOptions}
				onSelectEndpoint={selectEndpoint}
				disabled={connecting}
			/>

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
