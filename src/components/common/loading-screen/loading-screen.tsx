import { Spinner } from "#/components/ui/spinner";

export function LoadingScreen({ label = "Loading Avio" }: { label?: string }) {
	return (
		<div className="flex min-h-svh items-center justify-center bg-background">
			<div className="flex flex-col items-center gap-3 text-muted-foreground">
				<Spinner className="size-6" />
				<p className="text-sm">{label}</p>
			</div>
		</div>
	);
}
