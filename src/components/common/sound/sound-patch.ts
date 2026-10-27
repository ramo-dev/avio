import type { SoundPatch } from "@web-kits/audio";

export const PATCH = {
	name: "avio-ui",
	sounds: {
		tap: {
			source: { type: "sine", frequency: 1300, fm: { ratio: 0.5, depth: 100 } },
			envelope: { attack: 0, decay: 0.015, sustain: 0, release: 0.005 },
			gain: 0.2,
		},
		select: {
			source: { type: "triangle", frequency: { start: 900, end: 780 } },
			envelope: { attack: 0.001, decay: 0.055 },
			gain: 0.26,
		},
		toggleOn: {
			source: { type: "sine", frequency: { start: 520, end: 880 } },
			envelope: { attack: 0.002, decay: 0.085 },
			gain: 0.3,
		},
		toggleOff: {
			source: { type: "sine", frequency: { start: 780, end: 420 } },
			envelope: { attack: 0.002, decay: 0.085 },
			gain: 0.28,
		},

		open: {
			source: { type: "triangle", frequency: { start: 320, end: 620 } },
			filter: { type: "lowpass", frequency: 2600 },
			envelope: { attack: 0.006, decay: 0.13 },
			gain: 0.24,
		},
		close: {
			source: { type: "triangle", frequency: { start: 560, end: 300 } },
			filter: { type: "lowpass", frequency: 2200 },
			envelope: { attack: 0.004, decay: 0.11 },
			gain: 0.22,
		},
		tick: {
			source: { type: "square", frequency: 1400 },
			filter: { type: "lowpass", frequency: 3000 },
			envelope: { decay: 0.014 },
			gain: 0.1,
		},

		sliderTick: {
			layers: [
				{
					source: { type: "noise", color: "white" },
					filter: { type: "bandpass", frequency: 3000, resonance: 4 },
					envelope: { attack: 0, decay: 0.02, sustain: 0, release: 0.006 },
					gain: 0.19,
				},
				{
					source: { type: "sine", frequency: 700 },
					envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.004 },
					gain: 0.09,
				},
			],
		},
		destructive: {
			layers: [
				{
					source: { type: "triangle", frequency: { start: 300, end: 170 } },
					filter: { type: "lowpass", frequency: 1400 },
					envelope: { attack: 0.002, decay: 0.12 },
					gain: 0.32,
				},
				{
					source: { type: "noise", color: "brown" },
					filter: { type: "bandpass", frequency: 700, resonance: 1.1 },
					envelope: { decay: 0.05 },
					gain: 0.06,
				},
			],
		},
		key: {
			layers: [
				{
					source: { type: "sine", frequency: { start: 1000, end: 900 } },
					envelope: { attack: 0.001, decay: 0.028 },
					gain: 0.14,
				},
				{
					source: { type: "noise", color: "white" },
					filter: { type: "bandpass", frequency: 3200, resonance: 2 },
					envelope: { decay: 0.01 },
					gain: 0.035,
				},
			],
		},

		success: {
			layers: [
				{
					source: { type: "triangle", frequency: 784 },
					envelope: { attack: 0.004, decay: 0.16 },
					gain: 0.22,
				},
				{
					source: { type: "triangle", frequency: 1175 },
					envelope: { attack: 0.004, decay: 0.22 },
					gain: 0.18,
					delay: 0.075,
				},
			],
		},
		error: {
			layers: [
				{
					source: { type: "triangle", frequency: 300 },
					filter: { type: "lowpass", frequency: 1200 },
					envelope: { attack: 0.003, decay: 0.13 },
					gain: 0.26,
				},
				{
					source: { type: "triangle", frequency: 224 },
					filter: { type: "lowpass", frequency: 1000 },
					envelope: { attack: 0.003, decay: 0.2 },
					gain: 0.24,
					delay: 0.09,
				},
			],
		},

		warning: {
			layers: [
				{
					source: { type: "triangle", frequency: 622 },
					filter: { type: "lowpass", frequency: 2800 },
					envelope: { attack: 0.003, decay: 0.14 },
					gain: 0.2,
				},
				{
					source: { type: "triangle", frequency: 622 },
					filter: { type: "lowpass", frequency: 2800 },
					envelope: { attack: 0.003, decay: 0.18 },
					gain: 0.17,
					delay: 0.085,
				},
			],
		},

		copy: {
			layers: [
				{
					source: { type: "sine", frequency: 1200 },
					envelope: { attack: 0, decay: 0.015, sustain: 0, release: 0.006 },
					gain: 0.16,
				},
				{
					source: { type: "sine", frequency: 1400 },
					envelope: { attack: 0, decay: 0.015, sustain: 0, release: 0.006 },
					delay: 0.04,
					gain: 0.14,
				},
			],
		},

		notification: {
			layers: [
				{
					source: { type: "triangle", frequency: 523 },
					envelope: { attack: 0.008, decay: 0.3, sustain: 0.03, release: 0.12 },
					gain: 0.14,
				},
				{
					source: { type: "triangle", frequency: 784 },
					envelope: { attack: 0.008, decay: 0.25, sustain: 0.02, release: 0.1 },
					delay: 0.12,
					gain: 0.12,
				},
			],
		},

		swoosh: {
			source: { type: "sine", frequency: { start: 300, end: 2000 } },
			envelope: { attack: 0.008, decay: 0.12, sustain: 0, release: 0.04 },
			gain: 0.12,
		},

		chirp: {
			source: { type: "sine", frequency: { start: 1200, end: 1500 } },
			envelope: { attack: 0, decay: 0.03, sustain: 0, release: 0.01 },
			gain: 0.08,
		},

		command: {
			layers: [
				{
					source: { type: "triangle", frequency: { start: 1046, end: 784 } },
					envelope: { attack: 0.001, decay: 0.075 },
					gain: 0.2,
				},
				{
					source: { type: "sine", frequency: 1568 },
					envelope: { attack: 0.001, decay: 0.045 },
					gain: 0.06,
					delay: 0.018,
				},
			],
		},

		blocked: {
			source: { type: "sine", frequency: 180 },
			filter: { type: "lowpass", frequency: 700 },
			envelope: { attack: 0.004, decay: 0.06 },
			gain: 0.16,
		},
	},
} as const satisfies SoundPatch;

export type SoundName = keyof (typeof PATCH)["sounds"];
