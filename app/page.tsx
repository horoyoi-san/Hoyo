"use client";

import { useState, useEffect } from "react";
import GameInfos from "@/components/browse/game-infos";
import GameList from "@/components/browse/game-list";
import StartPage from "@/components/browse/start-page";
import Background from "@/components/background";

export default function Home() {
  const [appState, setAppState] = useState(0); // เริ่มต้นจากหน้า start
  const [region, setRegion] = useState<"os" | "cn">("os"); // เลือก region
  const [launcherId, setLauncherId] = useState(""); // string ของ region ที่เลือก
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState("");
  const [background, setBackground] = useState("/background.mp4");

  // อัพเดต launcherId ตาม region ที่เลือก
  useEffect(() => {
    const map = { os: "VYTpXlbWo8", cn: "jGHBHlcOq1" };
    setLauncherId(map[region]);
  }, [region]);

  return (
    <div className="w-full h-full overflow-hidden bg-[#1a1a1a] flex items-center justify-center flex-col p-2">
      {(appState === 0 || appState === -1) && (
        <StartPage
          setLauncherId={(id: string) => setLauncherId(id)}
          appState={appState}
          setState={setAppState}
        />
      )}

      {appState === 1 && launcherId && (
        <GameList
			launcherId={launcherId} // string ตรง ๆ
			games={games}
			setGames={setGames}
			setSelectedGame={setSelectedGame}
			setAppState={setAppState}
			setBackground={setBackground}
        />
      )}

      {appState === 2 && launcherId && (
        <GameInfos
			setAppState={setAppState}
			launcherId={launcherId} // string ตรง ๆ
			selectedGame={selectedGame}
			games={games}
			setBackground={setBackground}
        />
      )}

      <Background url={background} />
    </div>
  );
}
