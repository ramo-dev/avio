import { RiUploadCloud2Line } from "@remixicon/react";
import { cn } from "#/lib/utils";

type DropOverlayProps = {
	active: boolean;
	title?: string;
	hint?: string;
};

export function DropOverlay({
	active,
	title = "Drop files to attach",
	hint = "Images, videos and documents",
}: DropOverlayProps) {
	return (
		<div
			aria-hidden={!active}
			className={cn(
				"pointer-events-none fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm transition-opacity duration-150 motion-reduce:transition-none",
				active ? "opacity-100" : "opacity-0",
			)}
		>
			<div className="flex size-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary text-center">
				<div className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
					<RiUploadCloud2Line className="size-7" />
				</div>
				<p className="text-lg font-semibold">{title}</p>
				<p className="text-sm text-muted-foreground">{hint}</p>
			</div>
		</div>
	);
}
