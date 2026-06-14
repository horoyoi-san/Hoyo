import { Textarea } from "@/src/components/ui/textarea";
import { useMemo, useState } from "react";
import { ResponseHoyolab } from "../types/response-hoyolab.type";
import { Separator } from "@/src/components/ui/separator";
import { hoyolabToStoreParser } from "../utils/helpers";
import { useGetRelics } from "../../relic/hooks/use-get-relics.hook";
import { Button } from "@/src/components/ui/button";
import { useUserStore } from "@/src/store/use-user.store";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { VisuallyHidden } from "radix-ui";
import { Info, Terminal } from "lucide-react";
import PreviewCard, { PreviewCharacter } from "./preview-card.import";
import { Tooltip } from "@/src/components/ui/tooltip-card";
import { useTranslation } from "@/src/hooks/use-translation.hook";

const Hoyolab = () => {
  const [val, setVal] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const addImportedData = useUserStore((state) => state.addImportedData);
  const { data: allRelics } = useGetRelics();
  const { t } = useTranslation();

  const valToJson = useMemo(() => {
    if (!val.trim()) return null;

    try {
      const parsed = JSON.parse(val) as ResponseHoyolab;

      if (!parsed.data?.avatar_list) {
        return null;
      }

      const ids = parsed.data.avatar_list.map((char) => char.id);
      setSelectedIds(ids);

      return parsed;
    } catch (e) {
      // Don't log if it's just partially typed JSON
      return null;
    }
  }, [val]);

  const toggleChar = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (!valToJson) return;
    setSelectedIds(valToJson.data.avatar_list.map((c) => Number(c.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleImport = () => {
    if (!valToJson || !allRelics) return;

    const { newCharacters, newRelics } = hoyolabToStoreParser(
      valToJson,
      allRelics,
    );

    addImportedData(newRelics, newCharacters);

    toast.success(`Success! imported ${selectedIds.length} characters!`);
    setVal("");
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 min-h-0">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex gap-2 items-center mb-1">
              <h2 className="text-xl font-bold">{t("importFromHoyolab")}</h2>
              <Dialog>
                <Tooltip contentClassName="min-w-fit" content={<p>{t("tutorial")}</p>}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <Info size={14} className="text-white/50" />
                    </Button>
                  </DialogTrigger>
                </Tooltip>
                <DialogContent
                  showCloseButton={false}
                  className="p-0 overflow-hidden bg-black border-white/10"
                >
                  <VisuallyHidden.Root>
                    <DialogTitle>{t("tutorialImport")}</DialogTitle>
                  </VisuallyHidden.Root>
                  <video
                    src="/tutor.webm"
                    controls
                    className="w-full h-full"
                  ></video>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("hoyolabPasteDesc")}
            </p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute top-3 left-3 text-muted-foreground group-focus-within:text-[#00c3ff] transition-colors z-10">
            <Terminal size={18} />
          </div>
          <Textarea
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder={t("pasteJsonHere")}
            className="min-h-32 pl-10 pt-3 bg-white/[0.02] border-white/10 hover:border-white/20 focus:border-[#00c3ff]/50 transition-colors font-mono text-xs custom-scrollbar resize-y"
            spellCheck={false}
          />
          {val && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute top-2 right-2 h-7 px-2 text-xs bg-white/5 hover:bg-red-500/20 hover:text-red-400 z-10"
              onClick={() => setVal("")}
            >
              {t("clear")}
            </Button>
          )}
        </div>
      </div>

      {valToJson && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Separator className="bg-white/[0.08]" />
          
          <div className="flex justify-between items-end pb-2">
            <div>
              <h3 className="font-semibold text-lg text-[#00c3ff]">{t("selectCharacters")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("found")} {valToJson.data.avatar_list.length} {t("charactersInJson")}
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
            {valToJson.data.avatar_list.map((char) => {
              const propertyInfo = valToJson.data.property_info;
              
              const allRelicsOfChar = [...char.relics, ...char.ornaments];

              const previewChar: PreviewCharacter = {
                id: char.id,
                name: char.name,
                level: char.level,
                rank: char.rank,
                icon: `https://fribbels.github.io/hsr-optimizer/assets/icon/avatar/${char.id}.webp`,
                lightcone: char.equip ? {
                  id: char.equip.id,
                  name: char.equip.name || "None",
                  level: char.equip.level,
                  rank: char.equip.rank,
                  icon: `https://fribbels.github.io/hsr-optimizer/assets/image/light_cone_portrait/${char.equip.id}.webp`,
                } : undefined,
                relics: allRelicsOfChar.map(relic => {
                  const relicSetId = Math.floor(relic.id / 10) % 1000;
                  return {
                    id: relic.id,
                    setId: relicSetId,
                    name: relic.name,
                    icon: `https://cdn.neonteam.dev/neonteam/assets/spriteoutput/relicfigures/IconRelic_${relicSetId}_${relic.pos}.webp`,
                    mainStat: {
                      name: propertyInfo[relic.main_property.property_type].name,
                      value: relic.main_property.value
                    },
                    subStats: relic.properties.map(sub => ({
                      name: propertyInfo[sub.property_type].name,
                      value: sub.value
                    }))
                  }
                })
              };

              return (
                <PreviewCard
                  key={char.id}
                  character={previewChar}
                  isSelected={selectedIds.includes(Number(char.id))}
                  onToggle={() => toggleChar(Number(char.id))}
                />
              );
            })}
          </div>

          <div className="flex gap-4 pt-4 sticky bottom-0 bg-background/80 backdrop-blur-md p-4 -mx-4 border-t border-white/[0.08] z-30">
            <Button
              className="flex-1 h-12 font-bold bg-[#00c3ff] hover:bg-[#00c3ff]/80 text-black shadow-[0_0_15px_rgba(0,195,255,0.2)]"
              onClick={handleImport}
              disabled={selectedIds.length === 0}
            >
              {t("importSelected")} ({selectedIds.length})
            </Button>
            <Button 
              variant="outline" 
              className="h-12 px-8 border-white/10 hover:bg-white/5" 
              onClick={() => setVal("")}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hoyolab;
