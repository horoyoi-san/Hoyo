"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { convertFreesrToUserStore, convertFreesrToConfig } from "../utils/freesr.converter";

const FreesrImport = () => {
  const [jsonText, setJsonText] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setJsonText(text || "");
      toast.success("File loaded — ready to convert");
    };
    reader.readAsText(file);
  };

  const handleConvertDownload = () => {
    if (!jsonText) return toast.error("No file loaded");

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      return toast.error("Invalid JSON file");
    }

    const converted = convertFreesrToUserStore(parsed);
    const blob = new Blob([JSON.stringify(converted, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted-freesr-import.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Converted JSON downloaded");
  };

  const handleConvertAndImport = () => {
    if (!jsonText) return toast.error("No file loaded");

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      return toast.error("Invalid JSON file");
    }

    const converted = convertFreesrToUserStore(parsed);

    // Dispatch event that Database page listens to
    try {
      window.dispatchEvent(new CustomEvent("freesrImport", { detail: converted }));
      toast.success("Converted data sent to Database import dialog");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send import event");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <input type="file" accept="application/json" onChange={handleFile} />

      <div className="flex gap-2">
        <Button onClick={handleConvertDownload}>Download Converted JSON</Button>
        <Button variant="secondary" onClick={handleConvertAndImport}>
          Import to Database
        </Button>
        <Button variant="ghost" onClick={() => {
          if (!jsonText) return toast.error("No file loaded");
          try {
            const parsed = JSON.parse(jsonText);
            const cfg = convertFreesrToConfig(parsed);
            const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'converted-freesr-config.json';
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Config JSON downloaded');
          } catch (err) {
            console.error(err);
            toast.error('Failed to convert to config');
          }
        }}>Download Config</Button>
      </div>

      <details>
        <summary className="cursor-pointer">Preview loaded JSON</summary>
        <pre className="max-h-64 overflow-auto text-xs">{jsonText}</pre>
      </details>
    </div>
  );
};

export default FreesrImport;
