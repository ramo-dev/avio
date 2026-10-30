// Writes the production Content-Security-Policy for the prerendered SPA shell.
//
// Run after `vite build`. It hashes every inline script in `_shell.html`, so the
// policy always matches the shell that ships. It writes:
//   - a CSP <meta> tag into `_shell.html` and `index.html` (works on any host)
//   - `_headers` with the same policy plus `frame-ancestors` (Netlify, Cloudflare)
//
// Dev mode is not affected. Vite HMR needs inline scripts that this policy blocks.

import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

const OUTPUT_DIR = join(process.cwd(), ".output", "public")
const SHELL_PATH = join(OUTPUT_DIR, "_shell.html")
const INDEX_PATH = join(OUTPUT_DIR, "index.html")
const HEADERS_PATH = join(OUTPUT_DIR, "_headers")

const INLINE_SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/g
const INLINE_HANDLER = /<[^>]+\son[a-z]+\s*=/i

function sha256(text) {
	return `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`
}

function inlineScriptHashes(html) {
	const hashes = new Set()
	for (const match of html.matchAll(INLINE_SCRIPT)) {
		const attributes = match[1]
		if (/\bsrc\s*=/.test(attributes)) continue
		hashes.add(sha256(match[2]))
	}
	return [...hashes]
}

function buildDirectives(scriptHashes) {
	return {
		"default-src": ["'self'"],
		"script-src": ["'self'", ...scriptHashes],
		"style-src": ["'self'", "'unsafe-inline'"],
		"img-src": ["'self'", "blob:", "data:", "https:"],
		"media-src": ["'self'", "blob:", "https:"],
		"font-src": ["'self'"],
		"connect-src": ["'self'", "wss:", "https:"],
		"worker-src": ["'none'"],
		"frame-src": ["'none'"],
		"manifest-src": ["'self'"],
		"object-src": ["'none'"],
		"base-uri": ["'none'"],
		"form-action": ["'self'"],
	}
}

function serialize(directives, extra = []) {
	const parts = Object.entries(directives).map(
		([name, values]) => `${name} ${values.join(" ")}`,
	)
	return [...parts, ...extra].join("; ")
}

async function main() {
	if (!existsSync(SHELL_PATH)) {
		throw new Error(
			`Missing ${SHELL_PATH}. Run the Vite build before generating the CSP.`,
		)
	}

	const html = await readFile(SHELL_PATH, "utf8")
	if (INLINE_HANDLER.test(html)) {
		throw new Error(
			"The shell contains inline event handlers. The CSP would block them; move them into scripts.",
		)
	}

	const scriptHashes = inlineScriptHashes(html)
	const directives = buildDirectives(scriptHashes)
	const metaPolicy = serialize(directives)
	const headerPolicy = serialize(directives, ["frame-ancestors 'none'"])

	const meta = `<meta http-equiv="Content-Security-Policy" content="${metaPolicy}">`
	const patched = html.replace(/<head>/i, (open) => `${open}${meta}`)
	if (patched === html) {
		throw new Error("Could not find <head> in the shell to insert the CSP.")
	}

	await writeFile(SHELL_PATH, patched)
	await writeFile(INDEX_PATH, patched)
	await writeFile(HEADERS_PATH, `/*\n  Content-Security-Policy: ${headerPolicy}\n`)

	console.log(
		`CSP written: ${scriptHashes.length} inline script hash(es), ${Object.keys(directives).length} directives.`,
	)
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error)
	process.exitCode = 1
})
