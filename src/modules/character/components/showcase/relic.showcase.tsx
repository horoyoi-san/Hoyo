import { useParsedDesc } from "@/src/hooks/use-parsed-desc.hook";
import { useCharacterStore } from "../../store/use-character.store";
import { RELIC_SLOTS } from "../../utils/constants";
import { useGetRelicSets } from "@/src/modules/relic/hooks/use-get-relic-sets.hook";
import { useUserStore } from "@/src/store/use-user.store";
import { DEFAULT_CHAR_CONFIG } from "@/src/utils/constants";
import React, { useMemo } from "react";
import RelicCard from "@/src/modules/relic/components/relic-card";
import { Tooltip } from "@/src/components/ui/tooltip-card";

const RelicShowcase = () => {
  const charId = useCharacterStore((state) => state.id);
  const parseDesc = useParsedDesc();
  const { data: relicSets } = useGetRelicSets();

  const userRelics = useUserStore((state) => state.relics);
  const charConfig = useUserStore(
    (state) => state.characters[charId!] ?? DEFAULT_CHAR_CONFIG,
  );

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

      setData.set_bonus.forEach((bonusArr) => {
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

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-4 auto-rows-fr flex-1">
        {RELIC_SLOTS.map((slot) => {
          const equippedRelicId =
            charConfig.relics[slot.id as keyof typeof charConfig.relics];

          const relicEntry = equippedRelicId
            ? userRelics[equippedRelicId]
            : null;

          return (
            <React.Fragment key={slot.id}>
              {relicEntry ? (
                <RelicCard relic={relicEntry} />
              ) : (
                <div className="flex flex-col items-center rounded-lg justify-center bg-card/15">
                  <p className="text-muted-foreground text-xs italic">
                    no relic.
                  </p>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {activeSets.length > 0 ? (
          activeSets.map((set, idx) => {
            const params = set.properties.map((p: any) => p.value);

            return (
              <Tooltip
                containerClassName="hover:bg-primary/25 p-2 rounded-md"
                key={idx}
                content={
                  <div className="space-y-2">
                    <p className="font-semibold text-primary">{set.setName}</p>
                    <p
                      className="text-[11px] leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: parseDesc(set.desc, params),
                      }}
                    />
                  </div>
                }
              >
                <div className="min-w-0">
                  <p className="text-[10px] flex items-center font-bold text-secondary leading-none">
                    <span className="truncate">{set.setName}</span>
                    <span className="ml-2 text-[10px] shrink-0 bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">
                      {set.requirement}
                    </span>
                  </p>
                </div>
              </Tooltip>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-8 opacity-40">
            {null}
          </div>
        )}
      </div>
    </div>
  );
};

export default RelicShowcase;
