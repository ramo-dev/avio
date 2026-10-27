import { readdir, readFile, stat } from "node:fs/promises"
import { join, relative } from "node:path"

const ROOT = process.cwd()
const SRC = join(ROOT, "src")
const MAX_LINES = 300

const IGNORED_DIRS = new Set(["node_modules", "dist", ".git", ".tanstack"])
const EXEMPT_FILES = new Set(["src/routeTree.gen.ts"])

const failures = []

async function* walk(dir) {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		if (IGNORED_DIRS.has(entry.name)) continue
		const path = join(dir, entry.name)
		if (entry.isDirectory()) {
			yield* walk(path)
			continue
		}
		yield path
	}
}

function isGeneratedUi(relPath) {
	return relPath.startsWith("src/components/ui/")
}

for await (const path of walk(SRC)) {
	const relPath = relative(ROOT, path)
	if (EXEMPT_FILES.has(relPath) || isGeneratedUi(relPath)) continue
	if (!/\.(ts|tsx|css)$/.test(relPath)) continue

	const source = await readFile(path, "utf8")
	const lines = source.split("\n").length

	if (lines > MAX_LINES) {
		failures.push(`${relPath}: ${lines} lines (limit ${MAX_LINES})`)
	}

	if (/\b(TODO|FIXME)\b/.test(source)) {
		failures.push(`${relPath}: contains TODO/FIXME (use docs/backlog.md)`)
	}

	if (/from ["']lucide-react["']|from ["']@radix-ui\//.test(source)) {
		failures.push(`${relPath}: forbidden icon/primitive import`)
	}
}

const packageJson = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"))
const allDeps = {
	...packageJson.dependencies,
	...packageJson.devDependencies,
}

for (const [name, version] of Object.entries(allDeps)) {
	if (name === "lucide-react" || name === "radix-ui" || name.startsWith("@radix-ui/")) {
		failures.push(`package.json: forbidden dependency ${name}@${version}`)
	}
}

// Keep the rule audit honest: it must not silently pass on an empty source tree.
const srcInfo = await stat(SRC).catch(() => null)
if (!srcInfo?.isDirectory()) {
	failures.push("src/: directory not found")
}

if (failures.length > 0) {
	console.error("Rule audit failed:\n")
	for (const failure of failures) console.error(`  - ${failure}`)
	console.error("\nFix the files above or move deferred work to docs/backlog.md.")
	process.exit(1)
}

console.log("Rule audit passed.")
