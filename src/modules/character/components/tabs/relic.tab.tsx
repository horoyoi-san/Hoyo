
import { useTranslation } from "@/src/hooks/use-translation.hook";
import Image from "next/image";
import { useCharacterStore } from "../../store/use-character.store";
import { useUserStore } from "@/src/store/use-user.store";
import { DEFAULT_CHAR_CONFIG } from "@/src/utils/constants";
import { X, Plus } from "lucide-react";
import { useGetStatProperties } from "@/src/modules/relic/hooks/use-get-stat-properties.hook";
import { useGetRelics } from "@/src/modules/relic/hooks/use-get-relics.hook";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import RelicList from "@/src/modules/relic/components/relic-list";
import { useMemo, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { useGetMainAffixes } from "@/src/modules/relic/hooks/use-get-main-affixes.hook";
import { useGetSubAffixes } from "@/src/modules/relic/hooks/use-get-sub-affixes.hook";
import { useGetRelicSets } from "@/src/modules/relic/hooks/use-get-relic-sets.hook";
import { useParsedDesc } from "@/src/hooks/use-parsed-desc.hook";
import RelicCard from "@/src/modules/relic/components/relic-card";
import { RELIC_SLOTS } from "../../utils/constants";
import { VisuallyHidden } from "radix-ui";

const RelicTab = () => {
  const { t } = useTranslation();
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const charId = useCharacterStore((state) => state.id);
  const parseDesc = useParsedDesc();

  const userRelics = useUserStore((state) => state.relics);
  const equipRelic = useUserStore((state) => state.equipRelic);
  const charConfig = useUserStore(
    (state) => state.characters[charId!] ?? DEFAULT_CHAR_CONFIG,
  );
  const unequipRelic = useUserStore((state) => state.unequipRelic);

  const { data: allRelicData } = useGetRelics();
  const { data: statProperties } = useGetStatProperties();
  const { data: mainAffixes } = useGetMainAffixes();
  const { data: subAffixes } = useGetSubAffixes();
  const { data: relicSets } = useGetRelicSets();

  const activeSets = useMemo(() => {
    const counts: Record<number, number> = {};

    Object.values(charConfig.relics).forEach((relicId) => {
      if (relicId && userRelics[relicId]) {
        const setId = userRelics[relicId].relic_set_id;
        counts[setId] = (counts[setId] || 0) + 1;
      }
    });

    const activeBonuses: any[] = [];

    Object.entries(counts).forEach(([setId, count]) => {
      const setData = relicSets?.[setId];
      if (!setData) return;

      setData.set_bonus.forEach((bonusArr: any) => {
        const requirement = parseInt(bonusArr[0]);
        if (count >= requirement) {
          activeBonuses.push({
            setName: setData.name,
            setIcon: setData.icon,
            requirement,
            desc: bonusArr[1].desc,
            properties: bonusArr[1].properties,
          });
        }
      });
    });

    return activeBonuses;
  }, [charConfig.relics, userRelics, relicSets]);

  if (!allRelicData || !statProperties || !mainAffixes || !subAffixes) return;

  return (
    <div className="grid grid-cols-2 gap-8 w-full h-full min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-4 custom-scrollbar">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4 auto-rows-fr">
          {RELIC_SLOTS.map((slot) => {
            const equippedRelicId =
              charConfig.relics[slot.id as keyof typeof charConfig.relics];

            const relicEntry = equippedRelicId
              ? userRelics[equippedRelicId]
              : null;

            const isSelected = selectedSlot === slot.id;

            return (
              <div
                className={`relative group rounded-xl cursor-pointer overflow-hidden transition-all ${isSelected ? "ring-2 ring-primary scale-[1.02]" : ""}`}
                key={slot.id}
                onClick={() => setSelectedSlot(slot.id)}
                onDoubleClick={() => {
                  setSelectedSlot(slot.id);
                  setIsDialogOpen(true);
                }}
              >
                <p className="absolute top-2 left-3 text-[10px] uppercase tracking-widest text-muted-foreground font-bold z-20">
                  {slot.name}
                </p>

                {relicEntry ? (
                  <RelicCard
                    relic={relicEntry}
                    renderAction={
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          unequipRelic(Number(charId), slot.id);
                        }}
                      >
                        <X size={14} />
                      </Button>
                    }
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center bg-white/[0.02] hover:bg-white/[0.04] transition-colors duration-150 size-full border border-white/[0.04] rounded-xl min-h-[140px]">
                    <Plus className="text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 w-full mt-2">
          <Button 
            className="flex-1 bg-white/5 hover:bg-white/10 text-white" 
            disabled={!selectedSlot} 
            onClick={() => setIsDialogOpen(true)}
          >
            {t("changeRelic")}
          </Button>
          <Button 
            className="flex-1 bg-white/5 hover:bg-white/10 text-white" 
            disabled={!selectedSlot || !charConfig.relics[selectedSlot as keyof typeof charConfig.relics]} 
            onClick={() => {
              if (selectedSlot && charId) {
                unequipRelic(Number(charId), selectedSlot);
              }
            }}
          >
            {t("deleteRelic")}
          </Button>
        </div>
        <Button className="w-full bg-[#00c3ff] hover:bg-[#00c3ff]/80 text-black font-bold">
          {t("quickView")}
        </Button>
      </div>

      {/* BONUS SET */}
      <div className="p-4 rounded-xl space-y-4 h-fit">
        <h4 className="text-sm font-bold mb-2 uppercase opacity-70 flex items-center gap-2">
          <div className="w-0.5 h-4 bg-white/20" />
          {t("setEffects")}
        </h4>

        <div className="space-y-4">
          {activeSets.length > 0 ? (
            activeSets.map((set, idx) => {
              const params = set.properties.map((p: any) => p.value);

              return (
                <div key={idx} className="group relative">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="relative size-8 bg-white/[0.04] rounded-full border border-white/[0.08] p-1">
                      <Image
                        unoptimized
                        src={set.setIcon}
                        alt={set.setName}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white/80 leading-none">
                        {set.setName}
                        <span className="ml-2 text-[10px] bg-white/[0.08] px-1.5 py-0.5 rounded text-white/60">
                          {set.requirement}-Pc
                        </span>
                      </p>
                    </div>
                  </div>

                  <p
                    className="text-xs leading-relaxed pl-11"
                    dangerouslySetInnerHTML={{
                      __html: parseDesc(set.desc, params),
                    }}
                  />
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 opacity-40">
              <p className="text-[11px] italic">{t("noActiveSetBonuses")}</p>
            </div>
          )}
        </div>

        {activeSets.length > 0 && (
          <div className="pt-4 border-t border-white/[0.06]">
            <p className="text-sm font-bold uppercase opacity-50 mb-2">
              {t("passiveStatGain")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {activeSets
                .flatMap((s) => s.properties)
                .map((prop, i) => {
                  if (!prop.type) return null;
                  const isPct = !prop.type.includes("Delta");
                  return (
                    <div
                      key={i}
                      className="flex justify-between text-sm bg-background/40 p-1.5 rounded"
                    >
                      <span className="text-muted-foreground">
                        {statProperties?.[prop.type]?.name ?? "SPD"}
                      </span>
                      <span className="text-white">
                        +{isPct ? `${(prop.value * 100).toFixed(0)}%` : prop.value.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      <Dialog
        modal={false}
        open={isDialogOpen}
        onOpenChange={(open) => setIsDialogOpen(open)}
      >
        <DialogContent className="h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("selectRelic")}</DialogTitle>
            <VisuallyHidden.Root>
              <DialogDescription>
                {t("selectRelicToEquip")}
              </DialogDescription>
            </VisuallyHidden.Root>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4">
            <RelicList
              emptyClassName="col-span-6"
              withDelete={false}
              onSelect={(relicId, type) => {
                if (charId) {
                  equipRelic(Number(charId), relicId, type);
                  setIsDialogOpen(false);
                }
              }}
              type={selectedSlot}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RelicTab;
