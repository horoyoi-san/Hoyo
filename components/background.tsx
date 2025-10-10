"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Background({ url }: { url: string }) {
	const [src, setSrc] = useState(url);
	const [nextSrc, setNextSrc] = useState<string | null>(null);
	const [loaded, setLoaded] = useState(true);

	const isVideo = (file: string) =>
		file.endsWith(".mp4") || file.endsWith(".webm") || file.endsWith(".ogg");

	useEffect(() => {
		if (url !== src) {
			setLoaded(false);

			// ถ้าเป็นภาพ โหลดไว้ก่อน
			if (!isVideo(url)) {
				const img = new Image();
				img.src = url;
				img.onload = () => {
					setNextSrc(url);
					setLoaded(true);
				};
			} else {
				// ถ้าเป็นวิดีโอ ไม่ต้อง preload
				setNextSrc(url);
				setLoaded(true);
			}
		}
	}, [url, src]);

	return (
		<div className="absolute z-[0] w-full h-full pointer-events-none saturate-[0.4] blur-[3px] opacity-[0.6] overflow-hidden">
			{/* current background */}
			<motion.div
				key={src}
				className="absolute inset-0 w-full h-full"
				initial={{ opacity: 1 }}
				animate={{ opacity: nextSrc ? 0 : 1 }}
				transition={{ duration: 0.5 }}
				onAnimationComplete={() => {
					if (nextSrc) {
						setSrc(nextSrc);
						setNextSrc(null);
					}
				}}
			>
				{isVideo(src) ? (
					<video
						autoPlay
						loop
						muted
						playsInline
						className="w-full h-full object-cover"
						src={src}
					/>
				) : (
					<img
						src={src}
						className="w-full h-full object-cover"
						alt="background"
					/>
				)}
			</motion.div>

			{/* next background */}
			{nextSrc && loaded && (
				<motion.div
					key={nextSrc}
					className="absolute inset-0 w-full h-full"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.5 }}
				>
					{isVideo(nextSrc) ? (
						<video
							autoPlay
							loop
							muted
							playsInline
							className="w-full h-full object-cover"
							src={nextSrc}
						/>
					) : (
						<img
							src={nextSrc}
							className="w-full h-full object-cover"
							alt="background"
						/>
					)}
				</motion.div>
			)}
		</div>
	);
}
