import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const PORT = Number(process.env.CSP_PORT ?? 4173);
const BASE = `http://localhost:${PORT}`;
const WS = process.env.XMPP_WS ?? "ws://localhost:5280/xmpp-websocket";
const BUILD_INDEX = ".output/public/index.html";

async function waitFor(check, timeoutMs, label) {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		if (await check()) return;
		await delay(100);
	}
	throw new Error(`Timed out waiting for ${label}`);
}

async function isUp(url) {
	try {
		const response = await fetch(url);
		return response.ok;
	} catch {
		return false;
	}
}

function collect(page, violations, errors) {
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error" && !message.text().includes("favicon")) {
			errors.push(message.text());
		}
	});
	page.on("framenavigated", async () => {
		const found = await page.evaluate(() => window.__cspViolations ?? []).catch(() => []);
		violations.push(...found);
	});
}

async function login(page) {
	await page.goto(`${BASE}/connect`, { waitUntil: "networkidle" });
	await page.locator("#jid").fill("phiey@localhost");
	await page.locator("#password").fill("bob123");
	await page.getByRole("button", { name: "Connection options" }).click();
	await page.locator("#websocket").fill(WS);
	await page.getByRole("button", { name: "Done" }).click();
	await page.getByRole("button", { name: "Connect", exact: true }).click();
	await page.waitForURL(/\/chat/, { timeout: 20_000 });
	await page.waitForTimeout(800);
}

async function run() {
	if (!existsSync(BUILD_INDEX)) {
		throw new Error("Missing static build. Run pnpm build first.");
	}
	if (await isUp(BASE)) throw new Error(`Port ${PORT} is already in use.`);
	const server = spawn("node", ["scripts/serve-static.mjs"], {
		env: { ...process.env, PORT: String(PORT) },
		stdio: "ignore",
	});
	const violations = [];
	const errors = [];
	const browser = await chromium.launch({
		headless: true,
		args: ["--disable-features=LocalNetworkAccessChecks", "--disable-dev-shm-usage"],
	});
	try {
		await waitFor(() => isUp(`${BASE}/connect`), 20_000, "static server");
		const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
		await context.route("**/*", async (route) => {
			if (route.request().resourceType() !== "document") return route.continue();
			const response = await route.fetch();
			const body = (await response.text()).replace(
				"connect-src 'self' wss: https:",
				"connect-src 'self' wss: https: ws://localhost:5280",
			);
			await route.fulfill({
				response,
				body,
				headers: { ...response.headers(), "content-type": "text/html; charset=utf-8" },
			});
		});
		const page = await context.newPage();
		await page.addInitScript(() => {
			window.__cspViolations = [];
			document.addEventListener("securitypolicyviolation", (event) => {
				window.__cspViolations.push({
					directive: event.violatedDirective,
					blocked: event.blockedURI,
				});
			});
		});
		collect(page, violations, errors);

		for (const path of ["/", "/connect"]) {
			await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
			violations.push(...(await page.evaluate(() => window.__cspViolations ?? [])));
			await page.waitForTimeout(300);
		}

		await login(page);
		await page.locator('nav[aria-label="Primary"] button[aria-label="Settings"]').click({ force: true });
		await page.getByRole("dialog").waitFor();
		await page.getByRole("button", { name: /^Security$/ }).click();
		await page.waitForTimeout(700);
		violations.push(...(await page.evaluate(() => window.__cspViolations ?? [])));

		const state = await page.evaluate(() => ({
			cspMeta: document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]').length,
			styleSheets: document.styleSheets.length,
			hasSecurity: (document.body.innerText || "").includes("Security"),
			violations: window.__cspViolations ?? [],
		}));

		const unique = [...new Map(violations.map((item) => [`${item.directive}|${item.blocked}`, item])).values()];
		if (state.cspMeta !== 1) throw new Error("CSP meta tag is missing");
		if (state.styleSheets === 0) throw new Error("Stylesheets did not load");
		if (!state.hasSecurity) throw new Error("Settings > Security did not render");
		if (unique.length > 0) throw new Error(`CSP violations: ${JSON.stringify(unique)}`);
		if (errors.length > 0) throw new Error(`Console/page errors: ${errors.join(" | ")}`);

		console.log(JSON.stringify({ ok: true, cspMeta: state.cspMeta, styleSheets: state.styleSheets }, null, 2));
	} finally {
		await browser.close().catch(() => undefined);
		server.kill("SIGTERM");
	}
}

run().catch((error) => {
	console.error("CSP E2E FAILED:", error.message);
	process.exitCode = 1;
});
