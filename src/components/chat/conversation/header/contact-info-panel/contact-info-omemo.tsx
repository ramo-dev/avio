import {
	RiLoader4Line,
	RiLockLine,
	RiShieldCheckLine,
	RiShieldLine,
} from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { omemoErrorMessage } from "#/lib/omemo/errors";
import { useOmemo } from "#/providers/omemo-provider";
import type { OmemoDeviceInfo } from "#/types/omemo";

export function ContactInfoOmemo({
	jid,
	localDeviceId,
	title = "OMEMO devices",
}: {
	jid: string;
	localDeviceId?: number | null;
	title?: string;
}) {
	const { status, listDevices, trustDevice } = useOmemo();
	const [devices, setDevices] = useState<OmemoDeviceInfo[]>([]);
	const [loading, setLoading] = useState(false);
	const [trusting, setTrusting] = useState<number | null>(null);

	const load = useCallback(async () => {
		if (status !== "ready") {
			setDevices([]);
			return;
		}
		setLoading(true);
		try {
			setDevices(await listDevices(jid));
		} catch (error) {
			setDevices([]);
			toast.error(omemoErrorMessage(error, "Could not load OMEMO devices."), {
				id: "omemo-devices",
			});
		} finally {
			setLoading(false);
		}
	}, [jid, listDevices, status]);

	useEffect(() => {
		void load();
	}, [load]);

	async function trust(targetDeviceId: number, expectedFingerprint: string) {
		setTrusting(targetDeviceId);
		try {
			await trustDevice(jid, targetDeviceId, expectedFingerprint);
			setDevices(await listDevices(jid));
			toast.success("Device trusted", { id: "omemo-trust" });
		} catch (error) {
			toast.error(omemoErrorMessage(error, "Could not trust this device."), {
				id: "omemo-trust",
			});
		} finally {
			setTrusting(null);
		}
	}

	return (
		<div className="overflow-hidden rounded-xl border border-border bg-card">
			<div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
				<div className="flex items-center gap-2">
					<RiLockLine className="size-4 text-muted-foreground" />
					<p className="text-xs font-medium text-muted-foreground">{title}</p>
				</div>
				{loading && (
					<RiLoader4Line className="size-4 animate-spin text-muted-foreground" />
				)}
			</div>

			{status !== "ready" ? (
				<p className="px-4 py-4 text-xs leading-relaxed text-muted-foreground">
					{status === "setup"
						? "Set up OMEMO in Security settings to manage this contact's devices."
						: status === "locked"
							? "Unlock OMEMO to manage devices."
							: "OMEMO is not ready. Check Security settings or reconnect."}
				</p>
			) : devices.length === 0 && !loading ? (
				<p className="px-4 py-4 text-xs leading-relaxed text-muted-foreground">
					This person has not turned on end-to-end encryption on a device yet.
					Avio cannot encrypt to them until one appears. You can still send a
					normal message, but the server can read it.
				</p>
			) : (
				<ul className="divide-y divide-border">
					{devices.map((device) => (
						<li key={device.deviceId} className="flex flex-col gap-2 px-4 py-3">
							<div className="flex items-center justify-between gap-2">
								<div className="flex items-center gap-2">
									<RiShieldLine className="size-4 text-muted-foreground" />
									<span className="text-sm font-medium">
										Device {device.deviceId}
									</span>
								</div>
								{device.trusted ? (
									<Badge variant="default" className="gap-1">
										<RiShieldCheckLine />
										Trusted
									</Badge>
								) : device.deviceId === localDeviceId ? (
									<Badge variant="secondary">This device</Badge>
								) : (
									<Button
										type="button"
										size="xs"
										variant="outline"
										disabled={trusting !== null}
										onClick={() =>
											void trust(device.deviceId, device.fingerprint)
										}
									>
										{trusting === device.deviceId ? (
											<RiLoader4Line className="animate-spin" />
										) : null}
										Trust
									</Button>
								)}
							</div>
							<p className="font-mono text-[11px] leading-relaxed break-all text-muted-foreground">
								{device.fingerprint}
							</p>
						</li>
					))}
				</ul>
			)}

			{status === "ready" && devices.length > 0 && (
				<p className="border-t border-border px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
					Compare fingerprints in person or over another trusted channel before
					trusting a device.
				</p>
			)}
		</div>
	);
}
