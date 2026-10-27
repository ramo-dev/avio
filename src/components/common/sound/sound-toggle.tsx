import { type ComponentProps, useId } from "react";
import {
	setSoundMuted,
	useSoundMuted,
} from "#/components/common/sound/sound-store";
import { cn } from "#/lib/utils";

const SPEAKER =
	"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z";
const WAVE_INNER = "M16 9a5 5 0 0 1 0 6";
const WAVE_OUTER = "M19.364 18.364a9 9 0 0 0 0-12.728";
const SLASH = "M2 2 22 22";

export function SoundToggle({
	className,
	onClick,
	...props
}: ComponentProps<"button">) {
	const muted = useSoundMuted();
	const maskId = useId();

	return (
		<button
			type="button"
			aria-label={muted ? "Unmute interface sounds" : "Mute interface sounds"}
			aria-pressed={muted}
			onClick={(event) => {
				onClick?.(event);
				if (!event.defaultPrevented) setSoundMuted(!muted);
			}}
			data-sound="swoosh"
			{...props}
			className={cn(
				"flex size-7 cursor-pointer items-center justify-center rounded text-shell-fg-faint transition-[transform,box-shadow] duration-100 ease-out outline-none hover:bg-foreground/5 hover:text-shell-fg-muted focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] motion-reduce:transition-none",
				className,
			)}
		>
			<svg
				data-muted={muted}
				viewBox="0 0 24 24"
				width={17}
				height={17}
				fill="none"
				stroke="currentColor"
				strokeWidth={1.8}
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden
			>
				<title>Sound</title>
				<mask id={maskId}>
					<rect width="24" height="24" fill="white" />
					<path
						className="sound-slash"
						d={SLASH}
						pathLength={1}
						stroke="black"
						strokeWidth={4}
					/>
				</mask>
				<g mask={`url(#${maskId})`}>
					<path className="sound-speaker" d={SPEAKER} />
					<path className="sound-wave sound-wave-inner" d={WAVE_INNER} />
					<path className="sound-wave sound-wave-outer" d={WAVE_OUTER} />
				</g>
				<path className="sound-slash" d={SLASH} pathLength={1} />
			</svg>
		</button>
	);
}
