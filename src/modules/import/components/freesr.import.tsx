
import { useTranslation } from "@/src/hooks/use-translation.hook";
import { useState, useRef } from "react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { convertFreesrToUserStore, convertFreesrToConfig } from "../utils/freesr.converter";
import { UploadCloud, CheckCircle2 } from "lucide-react";
import { Separator } from "@/src/components/ui/separator";
import PreviewCard, { PreviewCharacter } from "./preview-card.import";
import { useCharacters } from "../../character/hooks/use-characters.hook";
import { useLightcones } from "../../character/hooks/use-lightcones.hook";
import { useGetRelics } from "../../relic/hooks/use-get-relics.hook";
import { useGetMainAffixes } from "../../relic/hooks/use-get-main-affixes.hook";
import { useGetSubAffixes } from "../../relic/hooks/use-get-sub-affixes.hook";
import { useGetStatProperties } from "../../relic/hooks/use-get-stat-properties.hook";
import { useParsedDesc } from "@/src/hooks/use-parsed-desc.hook";
import { decodeRelicString } from "../utils/helpers";
import { calculateSubAffixValue, isPercent } from "@/src/utils/helpers";
import { REVERSE_SLOT_MAP } from "../utils/constants";
import { useUserStore } from "@/src/store/use-user.store";

const FreesrImport = () => {
  const { t } = useTranslation();
  const [jsonText, setJsonText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parseDesc = useParsedDesc();

  const { data: allCharacters } = useCharacters();
  const { data: allLightcones, isPending: isPendingAllLightcones } = useLightcones();
  const { data: allRelics } = useGetRelics();
  const { data: mainAffixes } = useGetMainAffixes();
  const { data: subAffixes } = useGetSubAffixes();
  const { data: statProperties } = useGetStatProperties();

  const handleFileProcess = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      
      try {
        const parsed = JSON.parse(text);
        const converted = convertFreesrToUserStore(parsed);
        setParsedData(converted);
        setJsonText(text);
        setSelectedCharIds(Object.keys(converted.characters || {}));
        toast.success(t("fileParsedSuccessfully"));
      } catch (err) {
        toast.error(t("invalidJsonFile"));
        setParsedData(null);
        setJsonText("");
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const toggleChar = (id: string) => {
    setSelectedCharIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (!parsedData) return;
    setSelectedCharIds(Object.keys(parsedData.characters || {}));
  };

  const handleDeselectAll = () => {
    setSelectedCharIds([]);
  };

  const handleConvertDownload = () => {
    if (!parsedData) return toast.error(t("noFileLoaded"));

    const filteredCharacters = Object.keys(parsedData.characters)
      .filter((id) => selectedCharIds.includes(id))
      .reduce((acc, id) => ({ ...acc, [id]: parsedData.characters[id] }), {});

    const exportData = {
      ...parsedData,
      characters: filteredCharacters
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted-freesr-import.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("convertedJsonDownloaded"));
  };

  const handleConvertAndImport = () => {
    if (!parsedData) return toast.error(t("noFileLoaded"));

    const filteredCharacters = Object.keys(parsedData.characters)
      .filter((id) => selectedCharIds.includes(id))
      .reduce((acc, id) => ({ ...acc, [id]: parsedData.characters[id] }), {});

    const importData = {
      ...parsedData,
      characters: filteredCharacters
    };

    try {
      useUserStore.getState().addImportedData(importData.relics || {}, importData.characters || {});
      toast.success(`Success! Imported ${Object.keys(filteredCharacters).length} characters and their relics`);
      reset();
    } catch (err) {
      console.error(err);
      toast.error(t("failedToImportData"));
    }
  };

  const handleDownloadConfig = () => {
    if (!jsonText) return toast.error(t("noFileLoaded"));
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
  };

  const reset = () => {
    setJsonText("");
    setParsedData(null);
    setSelectedCharIds([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const charactersArray = parsedData?.characters ? Object.values(parsedData.characters) : [];

  return (
    <div className="space-y-6 flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 min-h-0">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold mb-1">{t("importFromFreeSR")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("uploadFreesrJson")}
          </p>
        </div>

        {!jsonText ? (
          <div
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 transition-all duration-300 cursor-pointer
              ${isDragging ? "border-[#00c3ff] bg-[#00c3ff]/5" : "border-white/20 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/40"}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              accept=".json"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <div className={`p-4 rounded-full transition-colors ${isDragging ? "bg-[#00c3ff]/20 text-[#00c3ff]" : "bg-white/5 text-white/60"}`}>
              <UploadCloud size={40} />
            </div>
            <div className="text-center space-y-1">
              <p className="font-bold text-lg text-white/90">{t("clickOrDragFreesr")}</p>
              <p className="text-sm text-muted-foreground">{t("supportedFormatJson")}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 items-center p-4 rounded-xl border border-[#00c3ff]/30 bg-[#00c3ff]/10">
              <div className="p-2 rounded-full bg-[#00c3ff]/20 text-[#00c3ff]">
                <CheckCircle2 size={24} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white">{t("freesrJsonParsed")}</p>
                <div className="flex gap-4 text-sm mt-1">
                  <span className="text-[#00c3ff] font-medium">
                    {charactersArray.length} Characters
                  </span>
                  <span className="text-[#00c3ff] font-medium">
                    {Object.keys(parsedData?.relics || {}).length} Relics
                  </span>
                </div>
              </div>
              <Button variant="ghost" onClick={reset} className="hover:bg-red-500/20 hover:text-red-400">
                {t("clearFile")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {parsedData && charactersArray.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          <Separator className="bg-white/[0.08]" />
          
          <div className="flex justify-between items-end pb-2">
            <div>
              <h3 className="font-semibold text-lg text-[#00c3ff]">{t("selectCharacters")}</h3>
              <p className="text-sm text-muted-foreground">
                Found {charactersArray.length} characters in file.
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll} className="border-white/10 hover:bg-white/5">
                {t("selectAll")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll} className="border-white/10 hover:bg-white/5">
                {t("deselectAll")}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {charactersArray.map((char: any) => {
              if (!allCharacters || !allLightcones || !allRelics || !mainAffixes || !subAffixes || !statProperties) return null;
              
              const charData = allCharacters[char.id];
              if (!charData) return null;
              
              const lightconeData = char.lightcone?.id ? allLightcones[char.lightcone.id] : null;

              const previewChar: PreviewCharacter = {
                id: char.id,
                name: parseDesc(charData.name, []) || charData.name,
                level: char.level || 80,
                rank: char.rank || 0,
                icon: `https://fribbels.github.io/hsr-optimizer/assets/icon/avatar/${char.id}.webp`,
                lightcone: char.lightcone?.id && lightconeData && !isPendingAllLightcones ? {
                  id: char.lightcone.id,
                  name: lightconeData.name,
                  level: char.lightcone.level,
                  rank: char.lightcone.rank,
                  icon: `https://fribbels.github.io/hsr-optimizer/assets/image/light_cone_portrait/${char.lightcone.id}.webp`
                } : undefined,
                relics: Object.values(char.relics || {}).filter(Boolean).map((uid: any) => {
                  try {
                    const relic = parsedData.relics[String(uid)];
                    if (!relic) return null;
                    
                    const relicData = allRelics[relic.relic_id];
                    if (!relicData) return null;
                    
                    const mainAffixData = mainAffixes[relicData.main_affix_id]?.[relic.main_affix_id];
                    if (!mainAffixData) return null;
                    
                    const mainAffixValue = mainAffixData.BaseValue.Value + relic.level * mainAffixData.LevelAdd.Value;

                    return {
                      id: relic.id,
                      setId: relic.relic_set_id,
                      name: relicData.name,
                      icon: `https://cdn.neonteam.dev/neonteam/assets/spriteoutput/relicfigures/IconRelic_${relic.relic_set_id}_${REVERSE_SLOT_MAP[relic.type]}.webp`,
                      mainStat: {
                        name: statProperties[mainAffixData.Property]?.name || mainAffixData.Property,
                        value: isPercent(mainAffixData.Property) ? `${(mainAffixValue * 100).toFixed(1)}%` : `${mainAffixValue.toFixed(0)}`
                      },
                      subStats: (relic.sub_affixes || []).map((sub: any) => {
                        const subData = subAffixes[5]?.[sub.sub_affix_id];
                        if (!subData) return null;
                        
                        const subValue = calculateSubAffixValue(subData.BaseValue.Value, subData.StepValue.Value, sub.step, sub.count);
                        return {
                          name: statProperties[subData.Property]?.name || subData.Property,
                          value: isPercent(subData.Property) ? `${(subValue * 100).toFixed(1)}%` : `${subValue.toFixed(1)}`
                        };
                      }).filter(Boolean) as any[]
                    };
                  } catch (e) {
                    return null;
                  }
                }).filter(Boolean) as any[]
              };

              return (
                <PreviewCard
                  key={char.id}
                  character={previewChar}
                  isSelected={selectedCharIds.includes(String(char.id))}
                  onToggle={() => toggleChar(String(char.id))}
                />
              );
            })}
          </div>

          <div className="flex gap-4 pt-4 sticky bottom-0 bg-background/80 backdrop-blur-md p-4 -mx-4 border-t border-white/[0.08] z-30">
            <Button 
              className="flex-1 h-12 font-bold bg-[#00c3ff] hover:bg-[#00c3ff]/80 text-black shadow-[0_0_15px_rgba(0,195,255,0.2)]" 
              onClick={handleConvertAndImport}
              disabled={selectedCharIds.length === 0}
            >
              Import Selected ({selectedCharIds.length})
            </Button>
            <Button 
              variant="outline" 
              className="h-12 border-white/20 hover:bg-white/5" 
              onClick={handleConvertDownload}
              disabled={selectedCharIds.length === 0}
            >
              {t("downloadConvertedJson")}
            </Button>
            <Button 
              variant="outline" 
              className="h-12 border-white/20 hover:bg-white/5" 
              onClick={handleDownloadConfig}
            >
              {t("downloadConfig")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreesrImport;
