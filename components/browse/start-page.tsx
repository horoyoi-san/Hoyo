import { useState } from "react";
import { Container } from "@/components/misc";
import { Input } from "@/components/ui/input";
import { BButton } from "@/components/buttons";

export default function StartPage({setLauncherId, appState, setState}: {setLauncherId: (id: string) => void, appState: number, setState: (state: number) => void}) {
	const [typed, setTyped] = useState("");
	
	const handleClick = () => {
		setLauncherId(typed);
		setState(1);
	}

	const [buttonDisabled, setButtonDisabled] = useState(true);
	
	return (
		<Container>
			<span className="text-white/60">กรุณาใส่รหัสตัวเรียกใช้งาน รหัสเริ่มต้นคือ &quot;<span className="text-white/95 select-all">jGHBHlcOq1</span>&quot; แต่คุณสามารถใช้ตัวอื่นได้ถ้าคุณต้องการ</span>
			
			{appState === -1 && (
				<span className="text-red-400 block mb-[-10px]"><br/>Invalid launcher id</span>
			)}
			<Input onChange={(e) => {setButtonDisabled(e.target.value === ""); setTyped(e.target.value)}} className="mt-4 mb-4 w-full" placeholder="Launcher id"></Input>
			
			<BButton callback={handleClick} disabled={buttonDisabled} text="Start" />
		</Container>
	)
}
