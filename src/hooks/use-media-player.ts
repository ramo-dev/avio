import { useCallback, useEffect, useState } from "react";

export function useMediaPlayer(
	ref: React.RefObject<HTMLMediaElement | null>,
	src: string,
	enabled = true,
) {
	const [playing, setPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [muted, setMuted] = useState(false);
	const [error, setError] = useState(false);

	useEffect(() => {
		const media = ref.current;
		if (!enabled || !media || !src) return;

		setPlaying(!media.paused);
		setCurrentTime(media.currentTime || 0);
		setMuted(media.muted);
		setError(false);

		const syncDuration = () => {
			setDuration(Number.isFinite(media.duration) ? media.duration : 0);
		};
		const syncTime = () => setCurrentTime(media.currentTime);
		const onPlay = () => setPlaying(true);
		const onPause = () => setPlaying(false);
		const onEnded = () => {
			setPlaying(false);
			setCurrentTime(Number.isFinite(media.duration) ? media.duration : 0);
		};
		const onError = () => {
			setError(true);
			setPlaying(false);
		};

		syncDuration();
		media.addEventListener("loadedmetadata", syncDuration);
		media.addEventListener("durationchange", syncDuration);
		media.addEventListener("timeupdate", syncTime);
		media.addEventListener("play", onPlay);
		media.addEventListener("pause", onPause);
		media.addEventListener("ended", onEnded);
		media.addEventListener("error", onError);

		return () => {
			media.removeEventListener("loadedmetadata", syncDuration);
			media.removeEventListener("durationchange", syncDuration);
			media.removeEventListener("timeupdate", syncTime);
			media.removeEventListener("play", onPlay);
			media.removeEventListener("pause", onPause);
			media.removeEventListener("ended", onEnded);
			media.removeEventListener("error", onError);
		};
	}, [enabled, ref, src]);

	const toggle = useCallback(() => {
		const media = ref.current;
		if (!media) return;

		if (media.paused) {
			if (media.ended) media.currentTime = 0;
			void media.play().catch(() => setPlaying(false));
			return;
		}
		media.pause();
	}, [ref]);

	const seek = useCallback(
		(value: number) => {
			const media = ref.current;
			if (!media) return;

			const limit = Number.isFinite(media.duration)
				? media.duration
				: Math.max(0, value);
			const next = Math.min(Math.max(value, 0), limit);
			media.currentTime = next;
			setCurrentTime(next);
		},
		[ref],
	);

	const toggleMuted = useCallback(() => {
		const media = ref.current;
		if (!media) return;

		media.muted = !media.muted;
		setMuted(media.muted);
	}, [ref]);

	return {
		playing,
		currentTime,
		duration,
		muted,
		error,
		toggle,
		seek,
		toggleMuted,
	};
}
