
import { useTranslation } from "@/src/hooks/use-translation.hook";
import { InputNumber } from "@/src/components/input/InputNumber";
import { Button } from "@/src/components/ui/button";
import { useUserStore } from "@/src/store/use-user.store";
import { BASE_URL } from "@/src/utils/constants";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { mihomoToStoreParser } from "../utils/helpers";
import { ResponseMihomo } from "../types/response-mihomo.type";
import { toast } from "sonner";
import { isPercent } from "@/src/utils/helpers";
import { Separator } from "@/src/components/ui/separator";
import PreviewCard, { PreviewCharacter } from "./preview-card.import";

const Mihomo = () => {
  const { t } = useTranslation();
  const [uid, setUid] = useState<number | string | undefined>();
  const [selectedCharIds, setSelectedCharIds] = useState<number[]>([]);

  const addImportedData = useUserStore((state) => state.addImportedData);

  const mutation = useMutation({
    mutationFn: async (uid: number): Promise<ResponseMihomo> => {
      const res = await fetch(`${BASE_URL.mihomo}/user/${uid}`);
      if (!res.ok) throw new Error("something went wrong");

      const data = await res.json();

      if (data.detail) {
        throw new Error(data.detail);
      }

      return data;
    },
    onSuccess: (data) => {
      const ids = data.characters?.map((c) => Number(c.id)) || [];
      setSelectedCharIds(ids);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleImport = () => {
    if (!mutation.data) return;

    const filteredCharacters = mutation.data.characters.filter((c) =>
      selectedCharIds.includes(Number(c.id)),
    );

    const dataToParse = { ...mutation.data, characters: filteredCharacters };
    const { newRelics, newCharacters } = mihomoToStoreParser(dataToParse);

    addImportedData(newRelics, newCharacters);

    toast.success(`Success! imported ${selectedCharIds.length} characters!`);

    mutation.reset();
    setUid(undefined);
  };

  const toggleChar = (id: number) => {
    setSelectedCharIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (!mutation.data) return;
    setSelectedCharIds(mutation.data.characters.map((c) => Number(c.id)));
  };

  const handleDeselectAll = () => {
    setSelectedCharIds([]);
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 min-h-0">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold mb-1">{t("importFromMihomo")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("onlyCharactersDisplayed")}
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!uid) return;
            mutation.mutate(Number(uid));
          }}
          className="flex gap-3"
        >
          <div className="relative flex-1 max-w-sm">
            <InputNumber
              className="pl-4 h-12 bg-white/[0.02] border-white/10 hover:border-white/20 focus:border-[#00c3ff]/50 transition-colors"
              placeholder={t("enterUid")}
              value={uid || ""}
              onChange={(v) => setUid(v)}
            />
          </div>
          <Button 
            type="submit" 
            className="h-12 px-8 font-bold bg-[#00c3ff] hover:bg-[#00c3ff]/80 text-black shadow-[0_0_15px_rgba(0,195,255,0.2)]"
            disabled={mutation.isPending || !uid}
          >
            {mutation.isPending ? "Fetching..." : "Fetch Profile"}
          </Button>
        </form>
      </div>

      {mutation.data && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Separator className="bg-white/[0.08]" />
          
          <div className="flex justify-between items-end pb-2">
            <div>
              <h3 className="font-semibold text-lg text-[#00c3ff]">{t("selectCharacters")}</h3>
              <p className="text-sm text-muted-foreground">
                Found {mutation.data.characters.length} characters for <span className="text-white font-bold">{mutation.data.player.nickname}</span>
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
            {mutation.data.characters.map((char) => {
              const previewChar: PreviewCharacter = {
                id: char.id,
                name: char.name,
                level: char.level,
                rank: char.rank,
                icon: `https://fribbels.github.io/hsr-optimizer/assets/icon/avatar/${char.id}.webp`,
                lightcone: char.light_cone?.id ? {
                  id: char.light_cone.id,
                  name: char.light_cone.name,
                  level: char.light_cone.level,
                  rank: char.light_cone.rank,
                  icon: `https://fribbels.github.io/hsr-optimizer/assets/image/light_cone_portrait/${char.light_cone.id}.webp`,
                } : undefined,
                relics: char.relics.map(relic => ({
                  id: relic.id,
                  setId: relic.set_id,
                  name: relic.name,
                  icon: `https://cdn.neonteam.dev/neonteam/assets/spriteoutput/relicfigures/IconRelic_${relic.set_id}_${relic.type}.webp`,
                  mainStat: {
                    name: relic.main_affix.name,
                    value: isPercent(relic.main_affix.type) ? `${(relic.main_affix.value * 100).toFixed(1)}%` : `${relic.main_affix.value.toFixed(0)}`
                  },
                  subStats: relic.sub_affix.map(sub => ({
                    name: sub.name,
                    value: isPercent(sub.type) ? `${(sub.value * 100).toFixed(1)}%` : `${sub.value.toFixed(1)}`
                  }))
                }))
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
              onClick={handleImport}
              disabled={selectedCharIds.length === 0}
            >
              Import Selected ({selectedCharIds.length})
            </Button>
            <Button 
              variant="outline" 
              className="h-12 px-8 border-white/10 hover:bg-white/5" 
              onClick={() => mutation.reset()}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mihomo;
