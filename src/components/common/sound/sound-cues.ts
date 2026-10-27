import { PATCH, type SoundName } from "#/components/common/sound/sound-patch";

export type Cue = { sound: SoundName; detune?: number; velocity?: number };

const JITTER: Record<SoundName, number> = {
	tap: 26,
	select: 22,
	toggleOn: 14,
	toggleOff: 14,
	open: 10,
	close: 10,
	tick: 18,
	sliderTick: 10,
	key: 20,
	destructive: 12,
	blocked: 30,
	chirp: 24,
	command: 8,

	copy: 6,

	notification: 3,
	swoosh: 14,

	success: 5,
	error: 5,
	warning: 5,
};

function jitter(cents: number) {
	return (Math.random() * 2 - 1) * cents;
}

type Patch = { play: (name: string, opts?: object) => unknown };

let audioWarm = false;

function play(patch: Patch, cue: Cue) {
	const sound = () =>
		patch.play(cue.sound, {
			detune: (cue.detune ?? 0) + jitter(JITTER[cue.sound]),

			velocity: (cue.velocity ?? 1) * (0.9 + Math.random() * 0.1),
		});
	if (audioWarm) {
		sound();
		return;
	}
	audioWarm = true;

	requestAnimationFrame(() => {
		window.setTimeout(sound, 0);
	});
}

function warm(patch: Patch) {
	if (audioWarm || !navigator.userActivation?.hasBeenActive) return;
	audioWarm = true;
	patch.play("tap", { volume: 0.0001 });
}

const TOGGLE_SLOTS = new Set([
	"switch",
	"checkbox",
	"toggle",
	"toggle-group-item",
	"radio-group-item",
	"context-menu-checkbox-item",
	"context-menu-radio-item",
	"dropdown-menu-checkbox-item",
	"dropdown-menu-radio-item",
	"menubar-checkbox-item",
	"menubar-radio-item",
]);

const INTERACTIVE =
	'[data-slot], button, a[href], [role="button"], [role="option"], [role="menuitem"], input[type="checkbox"], input[type="radio"]';

const TEXT_ENTRY =
	'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, [contenteditable]';

function isOn(el: Element) {
	if (el instanceof HTMLInputElement) return el.checked;
	return (
		el.getAttribute("aria-checked") === "true" ||
		el.getAttribute("aria-pressed") === "true" ||
		el.getAttribute("data-checked") !== null
	);
}

function classify(el: HTMLElement): Cue | null {
	const slot = el.dataset.slot ?? "";

	const named = el.dataset.sound;
	if (named && named in PATCH.sounds) return { sound: named as SoundName };

	if (
		TOGGLE_SLOTS.has(slot) ||
		el.matches(
			'input[type="checkbox"], input[type="radio"], [aria-pressed], [role="menuitemcheckbox"], [role="menuitemradio"]',
		)
	) {
		return { sound: isOn(el) ? "toggleOff" : "toggleOn" };
	}

	if (el.dataset.variant === "destructive") return { sound: "destructive" };
	if (slot.endsWith("-close")) return { sound: "close" };

	if (slot.endsWith("-clear") || slot.endsWith("-remove"))
		return { sound: "chirp" };
	if (slot.endsWith("-trigger")) {
		const expanded = el.getAttribute("aria-expanded");
		if (expanded === null) return { sound: "select" };
		return { sound: expanded === "true" ? "close" : "open" };
	}
	if (
		slot.endsWith("-item") ||
		slot.endsWith("-link") ||
		slot.endsWith("-option")
	) {
		return { sound: "select", detune: rowPitch(el) };
	}
	if (slot === "slider-thumb" || slot === "slider-track")
		return { sound: "tick" };
	if (slot === "button" || el.matches('button, a[href], [role="button"]')) {
		const soft =
			el.dataset.variant === "ghost" || el.dataset.variant === "link";
		return { sound: "tap", velocity: soft ? 0.78 : 1 };
	}
	return null;
}

function rowPitch(el: HTMLElement) {
	const siblings = el.parentElement?.children;
	if (!siblings) return 0;
	return Math.min([...siblings].indexOf(el), 7) * 55;
}

function soundFor(target: Element, keyed = false): Cue | null {
	if (target.closest(".command-overlay")) {
		const pointed = keyed ? target.getAttribute("aria-activedescendant") : null;
		const row = pointed
			? document.getElementById(pointed)
			: target.closest(".command-option");
		if (!row) return null;
		return {
			sound: row.querySelector(".command-option-more") ? "chirp" : "command",
		};
	}

	const labeled = target.closest("label")?.control ?? target;

	if (labeled.closest(TEXT_ENTRY)) return null;

	let el = labeled.closest<HTMLElement>(INTERACTIVE);
	while (el) {
		if (el.matches(':disabled, [aria-disabled="true"], [data-disabled]')) {
			return { sound: "blocked" };
		}
		const cue = classify(el);
		if (cue) return cue;
		el = el.parentElement?.closest<HTMLElement>(INTERACTIVE) ?? null;
	}
	return null;
}

function span(min: number, max: number, value: number) {
	return max === min
		? 0
		: Math.min(1, Math.max(0, (value - min) / (max - min)));
}

function sliderRange(el: HTMLElement) {
	if (el instanceof HTMLInputElement) {
		return {
			min: Number(el.min || 0),
			max: Number(el.max || 100),
			step: Math.abs(Number(el.step)) || 1,
		};
	}
	const read = (name: string, fallback: number) => {
		const value = Number(el.getAttribute(name));
		return Number.isFinite(value) ? value : fallback;
	};
	return {
		min: read("aria-valuemin", 0),
		max: read("aria-valuemax", 100),
		step: 1,
	};
}

export { play, warm, soundFor, sliderRange, span, TEXT_ENTRY };
