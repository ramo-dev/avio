export function TypingIndicator({ name }: { name: string }) {
	return (
		<output
			aria-label={`${name} is typing`}
			className="flex items-center gap-2 px-1"
		>
			<div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-none border border-border bg-card px-3 py-2.5">
				<span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-300ms]" />
				<span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-180ms]" />
				<span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-60ms]" />
			</div>
		</output>
	);
}
