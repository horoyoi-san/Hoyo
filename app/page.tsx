// ./app/page.tsx

"use client";

import { useState } from "react";
import GameInfos from "@/components/browse/game-infos";
import GameList from "@/components/browse/game-list";
import StartPage from "@/components/browse/start-page";
import Background from "@/components/background";

export default function Home() {
	const [appState, setAppState] = useState(1);
	const [launcherId, setLauncherId] = useState({
		os: "jGHBHlcOq1", // Global / OS
		cn: "gU7BCkj29M", // China / CN
	});
	const [games, setGames] = useState([]);
	const [selectedGame, setSelectedGame] = useState("");
	const [background, setBackground] = useState("/background.mp4");

    // ฟังก์ชันสำหรับ StartPage 
    const handleSetLauncherId = (newId: string) => {
        setLauncherId(prevIds => ({
            ...prevIds,
            os: newId, 
        }));
    };

	return (
		<div className="w-full h-full overflow-hidden bg-[#1a1a1a] flex items-center justify-center flex-col p-2">
			{(appState === 0 || appState === -1) && (
			<StartPage
				setLauncherId={handleSetLauncherId}
				appState={appState}
				setState={setAppState}
			/>
			)}
			{appState === 1 && (
				<GameList
					// ส่งแค่ ID เดียวที่เป็น string เพื่อให้ Type ผ่าน
					launcherId={launcherId.os} 
					// ลบ prop 'allLauncherIds' ออก
					games={games}
					setGames={setGames}
					setSelectedGame={setSelectedGame}
					setAppState={setAppState}
					setBackground={setBackground}
				/>
			)}
			{appState === 2 && (
				<GameInfos
					setAppState={setAppState}
					// ส่งแค่ ID เดียวที่เป็น string เพื่อให้ Type ผ่าน
					launcherId={launcherId.os} 
					// ลบ prop 'allLauncherIds' ออก
					selectedGame={selectedGame}
					games={games}
					setBackground={setBackground}
				/>
			)}

			<Background url={background} />
		</div>
	);
}