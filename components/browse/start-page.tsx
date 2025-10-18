import { useState } from "react";
import { Container } from "@/components/misc";
import { Input } from "@/components/ui/input";
import { BButton } from "@/components/buttons";

export default function StartPage({
  setLauncherId,
  appState,
  setState
}: {
  setLauncherId: (id: string) => void,
  appState: number,
  setState: (state: number) => void
}) {
  const [typed, setTyped] = useState("");
  const [region, setRegion] = useState<"os" | "cn">("os"); // เลือก Region

  const handleClick = () => {
    const launcherMap = {
      os: "VYTpXlbWo8",
      cn: "jGHBHlcOq1"
    };

    // ใช้ typed ถ้ามี ไม่งั้นใช้ launcherId ของ region
    const id = typed || launcherMap[region];
    setLauncherId(id); // ส่งเป็น string
    setState(1);       // ไปหน้า GameList
  };

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
          Global / OS
        </button>
        <button
          className={`px-3 py-1 rounded ${region === "cn" ? "bg-cyan-500" : "bg-gray-600"}`}
          onClick={() => setRegion("cn")}
        >
          China / CN
        </button>
      </div>

      <Input
        onChange={(e) => setTyped(e.target.value)}
        className="w-full mb-4"
        placeholder="Launcher id (optional)"
      />

      <BButton callback={handleClick} disabled={false} text="Start" />
    </Container>
  );
}
