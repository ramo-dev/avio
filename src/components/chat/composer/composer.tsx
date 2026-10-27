import { RiSendPlane2Fill } from "@remixicon/react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Textarea } from "#/components/ui/textarea";
import { useTyping } from "#/hooks/use-typing";
import { useXmppActions } from "#/hooks/xmpp/use-xmpp";

export function Composer({
	jid,
	disabled,
}: {
	jid: string;
	disabled: boolean;
}) {
	const actions = useXmppActions();
	const [body, setBody] = useState("");
	const notifyTyping = useTyping(jid, !disabled);

	function send() {
		const value = body.trim();
		if (!value || disabled) return;
		setBody("");
		void actions.sendMessage(jid, value);
	}

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				send();
			}}
			className="shrink-0 border-t border-border bg-background p-3"
		>
			<div className="mx-auto flex w-full max-w-3xl items-end gap-2">
				<Textarea
					value={body}
					onChange={(event) => {
						setBody(event.target.value);
						notifyTyping();
					}}
					onKeyDown={(event) => {
						if (event.key === "Enter" && !event.shiftKey) {
							event.preventDefault();
							send();
						}
					}}
					placeholder={
						disabled ? "Reconnect to send messages" : "Write a message"
					}
					aria-label="Message"
					disabled={disabled}
					rows={1}
					className="max-h-40 min-h-10 resize-none py-2.5"
				/>
				<Button
					type="submit"
					size="icon"
					disabled={disabled || body.trim().length === 0}
					aria-label="Send message"
				>
					<RiSendPlane2Fill />
				</Button>
			</div>
			<p className="mx-auto mt-1.5 hidden w-full max-w-3xl text-[0.7rem] text-muted-foreground sm:block">
				Enter to send · Shift + Enter for a new line
			</p>
		</form>
	);
}
