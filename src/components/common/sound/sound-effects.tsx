import { SoundProvider, usePatch } from "@web-kits/audio/react";
import { type ReactNode, useEffect, useRef } from "react";
import {
	play,
	sliderRange,
	soundFor,
	span,
	TEXT_ENTRY,
	warm,
} from "#/components/common/sound/sound-cues";
import { PATCH } from "#/components/common/sound/sound-patch";
import {
	useSoundMuted,
	useSoundVolume,
} from "#/components/common/sound/sound-store";

function SoundEffectListener() {
	const patch = usePatch(PATCH);
	const muted = useSoundMuted();

	const wasMuted = useRef(muted);
	useEffect(() => {
		const cameBack = wasMuted.current && !muted;
		wasMuted.current = muted;
		if (cameBack) play(patch, { sound: "swoosh" });
	}, [muted, patch]);

	useEffect(() => {
		if (!patch.ready) return;

		const TICK_GAP_MS = 28;
		const TICK_LAG_MS = 60;
		const DRAG_SLOP_PX = 3;

		let grab: { x: number; y: number; dragged: boolean } | null = null;
		let nextTickAt = 0;
		const queued = new Set<ReturnType<typeof setTimeout>>();

		const stopTicking = () => {
			for (const timer of queued) clearTimeout(timer);
			queued.clear();
			nextTickAt = 0;
		};

		const tick = (detune: number, now: number) => {
			if (nextTickAt - now > TICK_LAG_MS) return false;
			const wait = nextTickAt - now;
			nextTickAt += TICK_GAP_MS;
			const cue = { sound: "sliderTick", detune } as const;
			if (wait <= 0) {
				play(patch, cue);
				return true;
			}
			const timer = setTimeout(() => {
				queued.delete(timer);
				play(patch, cue);
			}, wait);
			queued.add(timer);
			return true;
		};

		const ratchet = (el: HTMLElement, from: number, to: number) => {
			const { min, max, step } = sliderRange(el);
			const crossed = Math.round(Math.abs(to - from) / step);
			if (!Number.isFinite(crossed) || crossed < 1) return;

			const now = performance.now();
			nextTickAt = Math.max(nextTickAt, now);
			const direction = Math.sign(to - from);

			for (let i = 1; i <= crossed; i++) {
				const value = from + direction * step * i;
				if (!tick(span(min, max, value) * 900, now)) break;
			}
		};

		const onPointerDown = (event: PointerEvent) => {
			if (event.button !== 0 || !(event.target instanceof Element)) return;
			const cue = soundFor(event.target);
			if (!cue) return;
			if (cue.sound === "tick")
				grab = { x: event.clientX, y: event.clientY, dragged: false };
			play(patch, cue);
		};

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Enter" && event.key !== " ") return;
			if (event.repeat || !(event.target instanceof Element)) return;
			const typing = event.target.matches(TEXT_ENTRY);

			const driving =
				event.key === "Enter" && event.target.closest(".command-overlay");
			if (typing && !driving) return;
			const cue = soundFor(event.target, true);
			if (cue) play(patch, cue);
		};

		const onPointerMove = (event: PointerEvent) => {
			if (!grab || grab.dragged) return;
			if (
				Math.hypot(event.clientX - grab.x, event.clientY - grab.y) >
				DRAG_SLOP_PX
			)
				grab.dragged = true;
		};

		const onPointerUp = () => {
			if (grab) stopTicking();
			grab = null;
		};

		const onContextMenu = () => play(patch, { sound: "open" });

		const onInput = (event: Event) => {
			if (!event.isTrusted) return;
			const el = event.target;
			if (
				!(el instanceof HTMLInputElement) ||
				!el.closest('[data-slot="input-otp"]')
			)
				return;
			const deleting =
				(event as InputEvent).inputType?.startsWith("delete") ?? false;
			play(patch, {
				sound: "key",
				detune: el.value.length * 45 - (deleting ? 260 : 0),
			});
		};

		const observer = new MutationObserver((records) => {
			let slid = false;

			for (const record of records) {
				const el = record.target;
				if (!(el instanceof HTMLElement)) continue;
				const value = el.getAttribute(record.attributeName ?? "");

				const entered =
					value !== null && value !== "false" && value !== record.oldValue;

				switch (record.attributeName) {
					case "aria-valuenow": {
						if (slid || !el.matches('input[type="range"], [role="slider"]'))
							break;

						if (value === null || record.oldValue === null) break;

						if (grab && !grab.dragged) break;
						slid = true;
						if (grab) {
							ratchet(el, Number(record.oldValue), Number(value));
							break;
						}
						const { min, max } = sliderRange(el);
						const now = performance.now();
						nextTickAt = Math.max(nextTickAt, now);
						tick(span(min, max, Number(value)) * 900, now);
						break;
					}
					case "data-success": {
						if (entered) play(patch, { sound: "success" });
						break;
					}
					case "aria-invalid":
					case "data-error": {
						if (entered) play(patch, { sound: "error" });
						break;
					}
					default:
						break;
				}
			}
		});

		observer.observe(document.body, {
			subtree: true,
			attributes: true,
			attributeOldValue: true,
			attributeFilter: [
				"aria-valuenow",
				"aria-invalid",
				"data-success",
				"data-error",
			],
		});

		document.addEventListener("pointerdown", onPointerDown, true);
		document.addEventListener("pointermove", onPointerMove, true);
		document.addEventListener("pointerup", onPointerUp, true);
		document.addEventListener("pointercancel", onPointerUp, true);
		document.addEventListener("keydown", onKeyDown, true);
		document.addEventListener("contextmenu", onContextMenu, true);
		document.addEventListener("input", onInput, true);
		return () => {
			observer.disconnect();
			stopTicking();
			document.removeEventListener("pointerdown", onPointerDown, true);
			document.removeEventListener("pointermove", onPointerMove, true);
			document.removeEventListener("pointerup", onPointerUp, true);
			document.removeEventListener("pointercancel", onPointerUp, true);
			document.removeEventListener("keydown", onKeyDown, true);
			document.removeEventListener("contextmenu", onContextMenu, true);
			document.removeEventListener("input", onInput, true);
		};
	}, [patch]);

	useEffect(() => {
		if (!patch.ready || muted) return;
		const handle = window.setTimeout(() => {
			warm(patch);
		}, 400);
		return () => {
			window.clearTimeout(handle);
		};
	}, [patch, muted]);

	return null;
}

export function SoundEffects({ children }: { children: ReactNode }) {
	const muted = useSoundMuted();
	const volume = useSoundVolume();

	return (
		<SoundProvider enabled={!muted} volume={volume}>
			<SoundEffectListener />
			{children}
		</SoundProvider>
	);
}
