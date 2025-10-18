import { useState } from "react";
import { Container } from "@/components/misc";
import { Input } from "@/components/ui/input";
import { BButton } from "@/components/buttons";

export default function StartPage({ setLauncherId, appState, setState }: {setLauncherId: React.Dispatch<React.SetStateAction<{ os: string; cn: string }>>, appState: number, setState: React.Dispatch<React.SetStateAction<number>> }) {

	const [typed, setTyped] = useState("");
	const [region, setRegion] = useState<"os" | "cn">("os"); // เลือก Region

	const handleClick = () => {
		// Launcher ID ตาม Region
		const launcherMap = {
			os: "VYTpXlbWo8",
			cn: "jGHBHlcOq1"
		};

		// ถ้า user ใส่เอง ให้ใช้ typed, ถ้าไม่ใส่ ใช้ Launcher ID ตาม Region
		const idToUse = typed.trim() !== "" ? typed.trim() : launcherMap[region];

		setLauncherId(idToUse);
		setState(1);
	}

	return (
		<Container>
			<span className="text-white/60">
				กรุณาใส่รหัสตัวเรียกใช้งาน หรือเลือก Region
			</span>

			{/* ปุ่มสลับ Region */}
			<div className="flex gap-2 mt-2 mb-4">
				<button
					className={`px-3 py-1 rounded ${region === "os" ? "bg-cyan-500" : "bg-gray-600"}`}
					onClick={() => setRegion("os")}
				>
					Hoyoverse OS
				</button>
				<button
					className={`px-3 py-1 rounded ${region === "cn" ? "bg-cyan-500" : "bg-gray-600"}`}
					onClick={() => setRegion("cn")}
				>
					miHoYo CN
				</button>
			</div>

			<Input
				onChange={(e) => setTyped(e.target.value)}
				className="w-full mb-4"
				placeholder="Launcher id (optional)"
			/>

			{/* ปุ่ม Start จะไม่ถูก disable ถ้าเลือก Region */}
			<BButton callback={handleClick} disabled={false} text="Start" />
		</Container>
	)
}
