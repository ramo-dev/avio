import { type CSSProperties, useEffect, useRef, useState } from "react";

const PATH_COUNT = 24;

interface FloatingPath {
	id: number;
	d: string;
	width: number;
	opacity: string;
	duration: number;
	delay: number;
}

function buildPaths(position: number): FloatingPath[] {
	return Array.from({ length: PATH_COUNT }, (_, i) => ({
		id: i,
		d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
			380 - i * 5 * position
		} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
			152 - i * 5 * position
		} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
			684 - i * 5 * position
		} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
		width: 0.5 + i * 0.03,
		// Peak stroke alpha; was `strokeOpacity * animated opacity` before.
		opacity: (0.06 + i * 0.018).toFixed(3),
		// Deterministic timing so SSR, hydration and re-renders agree.
		duration: 20 + (i % 6) * 2,
		delay: -(i * 0.7),
	}));
}

const FORWARD_PATHS = buildPaths(1);
const REVERSE_PATHS = buildPaths(-1);

/**
 * Decorative flowing lines.
 *
 * The path data is built once at module scope; re-renders only read it. The
 * animations are paused while the window is hidden or the layer is offscreen,
 * so a backgrounded app does not keep repainting 48 SVG strokes.
 */
export function FloatingPaths({ position }: { position: number }) {
	const paths = position === 1 ? FORWARD_PATHS : REVERSE_PATHS;
	const containerRef = useRef<HTMLDivElement>(null);
	const [inView, setInView] = useState(true);
	const [documentVisible, setDocumentVisible] = useState(true);

	useEffect(() => {
		const element = containerRef.current;
		if (!element || typeof IntersectionObserver === "undefined") return;

		const observer = new IntersectionObserver(([entry]) => {
			setInView(entry?.isIntersecting ?? true);
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		const update = () => {
			setDocumentVisible(document.visibilityState !== "hidden");
		};
		update();
		document.addEventListener("visibilitychange", update);
		return () => document.removeEventListener("visibilitychange", update);
	}, []);

	const paused = !inView || !documentVisible;

	return (
		// `isolate` + `contain-strict` keep the per-frame stroke repaints from
		// invalidating anything outside this box.
		<div
			className="pointer-events-none absolute inset-0 isolate contain-strict"
			data-floating-paused={paused ? "true" : undefined}
			ref={containerRef}
		>
			<svg
				aria-hidden="true"
				className="h-full w-full text-primary"
				fill="none"
				focusable="false"
				viewBox="0 0 696 316"
			>
				{paths.map((path) => (
					<path
						className="floating-path"
						d={path.d}
						key={path.id}
						// Normalise every path to length 1 so dash values are relative.
						pathLength={1}
						stroke="currentColor"
						// dash = full path, gap = full path; sweeping the offset from
						// 1 → -1 draws the line in from the start and then erases it,
						// ending invisible so the infinite loop has no seam.
						strokeDasharray="1 1"
						strokeOpacity={path.opacity}
						strokeWidth={path.width}
						style={
							{
								"--duration": `${path.duration}s`,
								"--stroke-opacity": path.opacity,
								animationDelay: `${path.delay}s`,
							} as CSSProperties
						}
					/>
				))}
			</svg>
		</div>
	);
}
