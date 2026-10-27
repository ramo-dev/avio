import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const src = fileURLToPath(new URL("./src", import.meta.url))

export default defineConfig({
	resolve: {
		alias: {
			"#": src,
			"@": src,
		},
	},
	test: {
		environment: "jsdom",
		include: ["src/**/*.test.{ts,tsx}"],
		passWithNoTests: false,
	},
})
