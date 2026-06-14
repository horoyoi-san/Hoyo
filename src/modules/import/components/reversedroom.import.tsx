
import { useTranslation } from "@/src/hooks/use-translation.hook";
import { useState, useRef } from "react";
import { Button } from "@/src/components/ui/button";
import { useUserStore } from "@/src/store/use-user.store";
import { Separator } from "@/src/components/ui/separator";
import { toast } from "sonner";
import { decodeRelicString, importConfigJsonParser } from "../utils/helpers";
import { useCharacters } from "../../character/hooks/use-characters.hook";
import { useLightcones } from "../../character/hooks/use-lightcones.hook";
import { calculateSubAffixValue, isPercent } from "@/src/utils/helpers";
import { REVERSE_SLOT_MAP } from "../utils/constants";
import { useGetRelics } from "../../relic/hooks/use-get-relics.hook";
import { useGetMainAffixes } from "../../relic/hooks/use-get-main-affixes.hook";
import { useGetSubAffixes } from "../../relic/hooks/use-get-sub-affixes.hook";
import { useGetStatProperties } from "../../relic/hooks/use-get-stat-properties.hook";
import { useParsedDesc } from "@/src/hooks/use-parsed-desc.hook";
import PreviewCard, { PreviewCharacter } from "./preview-card.import";
import { UploadCloud } from "lucide-react";

const ReversedRoom = () => {
  const { t } = useTranslation();
  const [tempData, setTempData] = useState<any>(null);
  const [selectedCharIds, setSelectedCharIds] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parseDesc = useParsedDesc();

  const { data: allCharacters } = useCharacters();
  const { data: allLightcones, isPending: isPendingAllLightcones } =
    useLightcones();
  const { data: allRelics } = useGetRelics();
  const { data: mainAffixes } = useGetMainAffixes();
  const { data: subAffixes } = useGetSubAffixes();
  const { data: statProperties } = useGetStatProperties();

  const addImportedData = useUserStore((state) => state.addImportedData);

  const handleFileProcess = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.avatar_config) {
          throw new Error("Invalid JSON format");
        }

        setTempData(json);
        setSelectedCharIds(json.avatar_config.map((c: any) => Number(c.id)));
      } catch (err) {
        toast.error(t("invalidJsonFormat"));
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

  const toggleChar = (id: number) => {
    setSelectedCharIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (!tempData) return;
    setSelectedCharIds(tempData.avatar_config.map((c: any) => Number(c.id)));
  };

  const handleDeselectAll = () => {
    setSelectedCharIds([]);
  };

  const handleProcessImport = () => {
    if (!tempData) return;

    const filteredData = {
      ...tempData,
      avatar_config: tempData.avatar_config.filter((c: any) =>
        selectedCharIds.includes(Number(c.id)),
      ),
    };

    const { newRelics, newCharacters } = importConfigJsonParser(filteredData);

    addImportedData(newRelics, newCharacters);

    toast.success(`Success! imported ${selectedCharIds.length} character`);
    reset();
  };

  const reset = () => {
    setTempData(null);
    setSelectedCharIds([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 min-h-0">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold mb-1">{t("importFromConfigJson")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("uploadConfigJson")}
          </p>
        </div>

        {!tempData ? (
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
              <p className="font-bold text-lg text-white/90">{t("clickOrDragJson")}</p>
              <p className="text-sm text-muted-foreground">{t("supportedFormatConfig")}</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 items-center p-4 rounded-xl border border-[#00c3ff]/30 bg-[#00c3ff]/10">
            <div className="p-2 rounded-full bg-[#00c3ff]/20 text-[#00c3ff]">
              <UploadCloud size={24} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">{t("configJsonLoaded")}</p>
              <p className="text-xs text-[#00c3ff]">Ready to process {tempData.avatar_config.length} characters</p>
            </div>
            <Button variant="ghost" onClick={reset} className="hover:bg-red-500/20 hover:text-red-400">
              {t("clearFile")}
            </Button>
          </div>
        )}
      </div>

      {tempData && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Separator className="bg-white/[0.08]" />
          
          <div className="flex justify-between items-end pb-2">
            <div>
              <h3 className="font-semibold text-lg text-[#00c3ff]">{t("selectCharactersToRestore")}</h3>
              <p className="text-sm text-muted-foreground">
                Found {tempData.avatar_config.length} characters in file.
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
            {tempData.avatar_config.map((char: any) => {
              if (!allCharacters || !allLightcones || !allRelics || !mainAffixes || !subAffixes || !statProperties) return null;
              
              const charData = allCharacters[char.id];
              if (!charData) return null;
              
              const lightconeData = char.lightcone?.id ? allLightcones[char.lightcone.id] : null;

              const previewChar: PreviewCharacter = {
                id: char.id,
                name: parseDesc(charData.name, []) || charData.name,
                level: char.level,
                rank: char.rank,
                icon: `https://fribbels.github.io/hsr-optimizer/assets/icon/avatar/${char.id}.webp`,
                lightcone: char.lightcone?.id && lightconeData && !isPendingAllLightcones ? {
                  id: char.lightcone.id,
                  name: lightconeData.name,
                  level: char.lightcone.level,
                  rank: char.lightcone.rank,
                  icon: `https://fribbels.github.io/hsr-optimizer/assets/image/light_cone_portrait/${char.lightcone.id}.webp`
                } : undefined,
                relics: char.relics.map((relicStr: string) => {
                  try {
                    const decodedRelic = decodeRelicString(relicStr);
                    const relicData = allRelics[decodedRelic.relic_id];
                    if (!relicData) return null;
                    
                    const mainAffixData = mainAffixes[relicData.main_affix_id]?.[decodedRelic.main_affix_id];
                    if (!mainAffixData) return null;
                    
                    const mainAffixValue = mainAffixData.BaseValue.Value + decodedRelic.level * mainAffixData.LevelAdd.Value;

                    return {
                      id: decodedRelic.relic_id,
                      setId: decodedRelic.relic_set_id,
                      name: relicData.name,
                      icon: `https://cdn.neonteam.dev/neonteam/assets/spriteoutput/relicfigures/IconRelic_${decodedRelic.relic_set_id}_${REVERSE_SLOT_MAP[decodedRelic.type]}.webp`,
                      mainStat: {
                        name: statProperties[mainAffixData.Property]?.name || mainAffixData.Property,
                        value: isPercent(mainAffixData.Property) ? `${(mainAffixValue * 100).toFixed(1)}%` : `${mainAffixValue.toFixed(0)}`
                      },
                      subStats: decodedRelic.sub_affixes.map(sub => {
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
                  isSelected={selectedCharIds.includes(Number(char.id))}
                  onToggle={() => toggleChar(Number(char.id))}
                />
              );
            })}
          </div>

          <div className="flex gap-4 pt-4 sticky bottom-0 bg-background/80 backdrop-blur-md p-4 -mx-4 border-t border-white/[0.08] z-30">
            <Button
              className="flex-1 h-12 font-bold bg-[#00c3ff] hover:bg-[#00c3ff]/80 text-black shadow-[0_0_15px_rgba(0,195,255,0.2)]"
              onClick={handleProcessImport}
              disabled={selectedCharIds.length === 0}
            >
              Import Selected ({selectedCharIds.length})
            </Button>
            <Button 
              variant="outline" 
              className="h-12 px-8 border-white/10 hover:bg-white/5" 
              onClick={reset}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReversedRoom;
