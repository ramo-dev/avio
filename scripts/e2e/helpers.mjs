import { setTimeout as delay } from "node:timers/promises";

export const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
export const XMPP_WS =
	process.env.XMPP_WS ?? "ws://localhost:5280/xmpp-websocket";
export const PASSWORD = process.env.XMPP_PASSWORD ?? "bob123";

export function browserOptions() {
	return {
		headless: true,
		args: [
			"--disable-features=LocalNetworkAccessChecks",
			"--disable-dev-shm-usage",
		],
	};
}

export function collectErrors(page) {
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") errors.push(message.text());
	});
	return errors;
}

export async function waitFor(check, timeoutMs = 20_000, label = "condition") {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		if (await check()) return;
		await delay(100);
	}
	throw new Error(`Timed out waiting for ${label}`);
}

export async function login(context, jid) {
	const page = await context.newPage();
	const errors = collectErrors(page);
	await page.goto(`${APP_URL}/connect`, { waitUntil: "networkidle" });
	await page.locator("#jid").fill(jid);
	await page.locator("#password").fill(PASSWORD);
	await page.getByRole("button", { name: "Connection options" }).click();
	await page.locator("#websocket").fill(XMPP_WS);
	await page.getByRole("button", { name: "Done" }).click();
	await page.getByRole("button", { name: "Connect", exact: true }).click();
	await page.waitForURL(/\/chat/, { timeout: 20_000 });
	await page.waitForTimeout(800);
	return { page, errors };
}

export async function acceptContactRequest(page) {
	const section = page.getByText("Contact requests").locator("xpath=..");
	if ((await section.count()) === 0) return false;
	const accept = section.getByRole("button", { name: "Accept" }).first();
	if ((await accept.count()) === 0) return false;
	await accept.click();
	await page.waitForTimeout(500);
	return true;
}

async function addContact(page, peerJid) {
	await page.getByRole("button", { name: "Add contact" }).click();
	await page.waitForTimeout(300);
	await page.locator("#contact-jid").fill(peerJid);
	await page.getByRole("button", { name: "Send request" }).click();
	await page.waitForTimeout(700);
}

export async function ensureContact(owner, peer, ownerJid, peerJid) {
	await owner.page.goto(`${APP_URL}/chat`, { waitUntil: "networkidle" });
	await owner.page.waitForTimeout(500);
	const existing = await owner.page
		.locator(`a[href*="${encodeURIComponent(peerJid)}"]`)
		.count();
	if (existing === 0) await addContact(owner.page, peerJid);

	await peer.page.waitForTimeout(700);
	await acceptContactRequest(peer.page);
	await owner.page.waitForTimeout(700);
	await acceptContactRequest(owner.page);
	await peer.page.waitForTimeout(300);
	await acceptContactRequest(peer.page);

	await owner.page.goto(`${APP_URL}/chat/${encodeURIComponent(peerJid)}`, {
		waitUntil: "networkidle",
	});
	await peer.page.goto(`${APP_URL}/chat/${encodeURIComponent(ownerJid)}`, {
		waitUntil: "networkidle",
	});
	await waitFor(
		async () => (await owner.page.locator("body").innerText()).includes("Online"),
		15_000,
		"owner presence",
	);
	await waitFor(
		async () => (await peer.page.locator("body").innerText()).includes("Online"),
		15_000,
		"peer presence",
	);
}

export async function sendMessage(page, body) {
	const composer = page.locator("textarea").last();
	await composer.fill(body);
	await composer.press("Enter");
	await page.waitForTimeout(250);
}

export async function scrollMetrics(page) {
	return page.evaluate(() => {
		const viewport = document.querySelector('[aria-label="Messages"]');
		const spacer = document.querySelector("[data-message-scroller-spacer]");
		const articles = [...document.querySelectorAll('[role="article"]')];
		const last = articles.at(-1);
		const viewportRect = viewport?.getBoundingClientRect();
		const lastRect = last?.getBoundingClientRect();
		return {
			spacerHidden:
				spacer instanceof HTMLElement ? spacer.hidden : null,
			blankBelowLast:
				viewportRect && lastRect
					? Math.round(viewportRect.bottom - lastRect.bottom)
					: null,
		};
	});
}

export async function createGroup(owner, peerName, roomName) {
	await owner.page.goto(`${APP_URL}/chat`, { waitUntil: "networkidle" });
	await owner.page.getByRole("button", { name: "New group" }).click();
	await owner.page.locator("#group-name").fill(roomName);
	const dialog = owner.page.getByRole("dialog");
	await dialog.getByRole("button", { name: new RegExp(peerName, "i") }).first().click();
	await dialog.getByRole("button", { name: "Create group" }).click();
	await owner.page.waitForURL(/\/chat\/group\//, { timeout: 20_000 });
	await owner.page.waitForTimeout(800);
	return owner.page.url().split("?")[0];
}

export async function acceptGroupInvite(page, roomName) {
	const item = page.locator("li").filter({ hasText: roomName }).first();
	await item.waitFor({ timeout: 20_000 });
	await item.getByRole("button", { name: "Accept" }).click();
	await page.waitForURL(/\/chat\/group\//, { timeout: 20_000 });
	await page.waitForTimeout(800);
}
