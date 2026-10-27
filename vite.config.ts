import { createRequire } from "node:module";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const require = createRequire(import.meta.url);

const config = defineConfig({
	resolve: {
		tsconfigPaths: true,
		// Stanza's client extends Node's EventEmitter. Vite externalizes Node
		// built-ins in the browser, so point `events` at the browser polyfill.
		alias: {
			events: require.resolve("events/events.js"),
		},
	},
	plugins: [
		devtools(),
		nitro({ rollupConfig: { external: [/^@sentry\//] } }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
