import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import {
	APP_URL,
	acceptGroupInvite,
	browserOptions,
	createGroup,
	ensureContact,
	login,
	scrollMetrics,
	sendMessage,
	waitFor,
} from "./helpers.mjs";

const OWNER = "phiey@localhost";
const PEER = "sam@localhost";

async function isUp(url) {
	try {
		const response = await fetch(url);
		return response.ok;
	} catch {
		return false;
	}
}

async function startDevIfNeeded() {
	if (await isUp(`${APP_URL}/connect`)) return null;
	const child = spawn("pnpm", ["dev"], {
		detached: true,
		stdio: "ignore",
	});
	await waitFor(
		() => isUp(`${APP_URL}/connect`),
		60_000,
		"dev server",
	);
	return child;
}

function stop(child) {
	if (!child) return;
	try {
		process.kill(-child.pid, "SIGTERM");
	} catch {
		child.kill("SIGTERM");
	}
}

async function checkXmpp() {
	await new Promise((resolve, reject) => {
		const socket = new WebSocket(
			process.env.XMPP_WS ?? "ws://localhost:5280/xmpp-websocket",
			"xmpp",
		);
		const timer = setTimeout(() => {
			socket.close();
			reject(new Error("XMPP WebSocket did not open. Run pnpm xmpp:up."));
		}, 8_000);
		socket.onopen = () => {
			clearTimeout(timer);
			socket.close();
			resolve();
		};
		socket.onerror = () => {
			clearTimeout(timer);
			reject(new Error("XMPP WebSocket unavailable. Run pnpm xmpp:up."));
		};
	});
}

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

function relevantErrors(errors) {
	return errors.filter((error) => !error.includes("favicon"));
}

async function run() {
	const failures = [];
	const dev = await startDevIfNeeded();
	const browser = await chromium.launch(browserOptions());
	try {
		await checkXmpp();
		const owner = await login(await browser.newContext({ viewport: { width: 1280, height: 900 } }), OWNER);
		const peer = await login(await browser.newContext({ viewport: { width: 1280, height: 900 } }), PEER);

		await ensureContact(owner, peer, OWNER, PEER);

		const dmMarker = `smoke dm ${Date.now()}`;
		await sendMessage(owner.page, dmMarker);
		await waitFor(
			async () => (await peer.page.locator("body").innerText()).includes(dmMarker),
			10_000,
			"DM delivery",
		);

		const roomName = `Smoke ${Date.now()}`;
		const roomUrl = await createGroup(owner, "sam", roomName);
		await peer.page.goto(`${APP_URL}/chat`, { waitUntil: "networkidle" });
		await peer.page.waitForTimeout(600);
		await acceptGroupInvite(peer.page, roomName);

		const groupMarker = `smoke group ${Date.now()}`;
		await sendMessage(owner.page, groupMarker);
		await waitFor(
			async () => (await peer.page.locator("body").innerText()).includes(groupMarker),
			10_000,
			"group delivery",
		);

		const article = peer.page.locator('[role="article"]').last();
		await article.hover();
		await article.getByRole("button", { name: "Add reaction" }).click();
		await peer.page.getByRole("button", { name: "React with 👍" }).click();
		await waitFor(
			async () => (await peer.page.locator('[data-slot="message-reactions"] button[aria-pressed="true"]').count()) > 0,
			10_000,
			"local reaction",
		);
		await waitFor(
			async () => {
				const chip = owner.page
					.locator('[data-slot="message-reactions"] button')
					.first();
				const label = await chip.getAttribute("aria-label").catch(() => null);
				return Boolean(label?.includes("sam"));
			},
			10_000,
			"reaction author label on the other side",
		);

		await peer.page.reload({ waitUntil: "networkidle" });
		await peer.page.waitForTimeout(1_200);
		await waitFor(
			async () => (await peer.page.locator('[data-slot="message-reactions"]').count()) > 0,
			10_000,
			"reaction after refresh",
		);

		for (let index = 0; index < 6; index += 1) {
			await sendMessage(owner.page, `burst ${index} ${Date.now()}`);
		}
		await owner.page.waitForTimeout(2_000);
		const metrics = await scrollMetrics(owner.page);
		assert(metrics.spacerHidden === true, `transcript spacer is visible: ${JSON.stringify(metrics)}`);
		assert((metrics.blankBelowLast ?? 999) < 60, `blank transcript space: ${metrics.blankBelowLast}px`);

		await owner.page.locator("header button:has(h2)").first().click();
		await owner.page.waitForTimeout(600);
		assert(owner.page.url().includes("?panel="), "group info did not open in the URL");
		assert(!owner.page.url().includes("%253A"), "panel URL is double-encoded");
		await owner.page.reload({ waitUntil: "networkidle" });
		await owner.page.waitForTimeout(900);
		assert(
			(await owner.page.locator("body").innerText()).includes("Members"),
			"group info did not restore after refresh",
		);

		const errors = [...relevantErrors(owner.errors), ...relevantErrors(peer.errors)];
		assert(errors.length === 0, `console/page errors: ${errors.join(" | ")}`);

		console.log(
			JSON.stringify(
				{
					ok: true,
					room: roomUrl,
					checks: {
						dmDelivery: true,
						mutualPresence: true,
						groupDelivery: true,
						reaction: true,
						reactionAfterRefresh: true,
						transcriptSpacer: metrics.spacerHidden,
						panelRestore: true,
					},
				},
				null,
				2,
			),
		);
	} catch (error) {
		failures.push(error instanceof Error ? error.message : String(error));
		console.error("E2E FAILED:", failures[0]);
	} finally {
		await browser.close().catch(() => undefined);
		stop(dev);
	}
	if (failures.length > 0) process.exitCode = 1;
}

run().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
