// Dev-only attachment smoke: requires the local Prosody upload component.
// Verifies upload -> OOB message -> remote-media placeholder -> tap to load.
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import {
	APP_URL,
	XMPP_WS,
	browserOptions,
	login,
	sendMessage,
	ensureContact,
} from "./helpers.mjs";

// 1x1 red PNG
const PNG_BASE64 =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";

async function waitFor(check, timeoutMs, label) {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		if (await check()) return;
		await delay(100);
	}
	throw new Error(`Timed out waiting for ${label}`);
}

function trace(page) {
	page.on("request", (request) => {
		if (request.url().includes("upload")) {
			console.log("REQ", request.method(), request.url());
		}
	});
	page.on("response", (response) => {
		if (response.url().includes("upload")) {
			console.log("RES", response.status(), response.url(), JSON.stringify(response.headers()));
		}
	});
	page.on("requestfailed", (request) => {
		console.log("FAILED", request.url(), request.failure()?.errorText);
	});
}

async function lastAttachmentInfo(page) {
	return page.evaluate(() => {
		const cards = [...document.querySelectorAll('[role="article"]')].at(-1);
		if (!cards) return null;
		return {
			text: (cards.textContent || "").slice(0, 120),
			hasPlaceholder: Boolean(cards.querySelector('[data-slot="media-placeholder"], button[aria-label^="Load image"]')),
			image: cards.querySelector("img")?.naturalWidth ?? null,
		};
	});
}

(async () => {
	const browser = await chromium.launch(browserOptions());
	let failed = false;
	try {
		const owner = await login(await browser.newContext({ viewport: { width: 1280, height: 900 } }), "phiey@localhost");
		const peer = await login(await browser.newContext({ viewport: { width: 1280, height: 900 } }), "sam@localhost");

		await owner.page.goto(`${APP_URL}/chat/sam%40localhost`, { waitUntil: "networkidle" });
		await owner.page.goto(`${APP_URL}/chat`, { waitUntil: "networkidle" });
		await owner.page.waitForTimeout(400);
		await ensureContact(owner, peer, "phiey@localhost", "sam@localhost");

		const fileDir = await mkdtemp(join(tmpdir(), "avio-upload-"));
		const filePath = join(fileDir, "upload-test.png");
		await writeFile(filePath, Buffer.from(PNG_BASE64, "base64"));

		trace(owner.page);
		trace(peer.page);
		const imageInput = owner.page.locator('input[type="file"][accept*="image"]').first();
		await imageInput.setInputFiles(filePath);
		await owner.page.waitForTimeout(800);
		console.log("DEBUG", JSON.stringify(await owner.page.evaluate(() => ({
			url: location.href,
			files: document.querySelectorAll('input[type="file"]')[0]?.files?.length,
			trayItems: document.querySelectorAll('[aria-label="Attachments"] li').length,
			articles: document.querySelectorAll('[role="article"]').length,
			bodyTail: document.body.innerText.slice(-160),
		}))));
		await sendMessage(owner.page, "");
		await owner.page.waitForTimeout(4_000);
		console.log("OWNER_BODY", JSON.stringify((await owner.page.locator("body").innerText()).slice(-500)));
		console.log("OWNER_ERRORS", owner.errors.join(" | "));
		await owner.page.waitForTimeout(2_500);
		const uploaded = await lastAttachmentInfo(owner.page);
		await waitFor(
			async () => (await lastAttachmentInfo(peer.page))?.text.includes("upload-test.png"),
			15_000,
			"attachment delivery",
		);
		const peerPlaceholder = await lastAttachmentInfo(peer.page);
		await peer.page.locator('button[aria-label^="Load image"]').last().click();
		await waitFor(
			async () => (await lastAttachmentInfo(peer.page)).image === 1,
			10_000,
			"remote image load",
		);
		const loaded = await lastAttachmentInfo(peer.page);

		console.log(
			JSON.stringify(
				{
					ok: true,
					uploaded: uploaded?.text,
					peerPlaceholder: peerPlaceholder?.hasPlaceholder,
					peerLoaded: loaded.image,
				},
				null,
				2,
			),
		);
	} catch (error) {
		console.error("ATTACHMENT E2E FAILED:", error.message);
		failed = true;
	} finally {
		await browser.close().catch(() => undefined);
	}
	process.exitCode = failed ? 1 : 0;
})();
