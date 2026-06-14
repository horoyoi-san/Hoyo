"use client";

import { Button } from "@/src/components/ui/button";
import { useUserStore } from "@/src/store/use-user.store";
import { generateConfigJson } from "./utils/helpers";

const ExportPage = () => {
  const characters = useUserStore((state) => state.characters);
  const relics = useUserStore((state) => state.relics);

  const handleExport = () => {
    const exportData = generateConfigJson(Object.values(characters), relics);

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `config.json`;
    a.click();
  };

  return (
    <div className="wrapper card space-y-4">
      <p className="text-xl font-semibold">Export</p>
      <p>
        * Characters missing a lightcone or any relic slots will not be
        exported.
      </p>
      <Button onClick={handleExport}>Download as config.json</Button>
    </div>
  );
};

export default ExportPage;
