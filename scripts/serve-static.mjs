// Serves the static production build the way a static host would.
//
// Files in `.output/public` are served as-is. App routes such as `/chat/alice`
// fall back to `index.html` (the CSP-patched shell). Missing asset files return
// 404 instead of the shell.
//
// This server does not send `_headers`. The CSP is also in the shell's meta tag,
// so it still applies. Use a host that reads `_headers` to test frame-ancestors.

import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import { extname, join, resolve, sep } from "node:path"

const ROOT = resolve(process.cwd(), ".output", "public")
const PORT = Number(process.env.PORT ?? 4173)

const CONTENT_TYPES = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".webp": "image/webp",
	".woff2": "font/woff2",
	".ico": "image/x-icon",
	".txt": "text/plain; charset=utf-8",
}

async function resolveFile(pathname) {
	const candidate = resolve(ROOT, `.${pathname}`)
	if (candidate !== ROOT && !candidate.startsWith(ROOT + sep)) return null
	try {
		const info = await stat(candidate)
		if (info.isFile()) return candidate
		if (info.isDirectory()) return join(candidate, "index.html")
	} catch {
		// Fall through to the SPA fallback for navigation requests.
	}
	return null
}

const server = createServer(async (request, response) => {
	const url = new URL(request.url ?? "/", "http://localhost")
	const pathname = decodeURIComponent(url.pathname)
	let file = await resolveFile(pathname)

	if (!file) {
		if (extname(pathname)) {
			response.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
			response.end("Not found")
			return
		}
		file = join(ROOT, "index.html")
	}

	try {
		const body = await readFile(file)
		response.writeHead(200, {
			"content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream",
		})
		response.end(body)
	} catch {
		response.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
		response.end("Not found")
	}
})

server.listen(PORT, () => {
	console.log(`Serving ${ROOT} at http://localhost:${PORT} (SPA fallback enabled)`)
})
