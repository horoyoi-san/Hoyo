import { Button } from "@/src/components/ui/button";
import { ButtonGroup } from "@/src/components/ui/button-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { calculateSubAffixValue, isPercent } from "@/src/utils/helpers";
import { Minus } from "lucide-react";
import React from "react";
import { useCreateRelicStore } from "../store/use-create-relic.store";
import { useGetSubAffixes } from "../../hooks/use-get-sub-affixes.hook";
import { useGetStatProperties } from "../../hooks/use-get-stat-properties.hook";

interface Props {
  mainAffixProperty?: string;
}

const SubAffixCreateRelic = ({ mainAffixProperty }: Props) => {
  const { data: statPorperties } = useGetStatProperties();
  const { data: subAffixes } = useGetSubAffixes();

  const relic = useCreateRelicStore((state) => state.relic);
  const randomizeStat = useCreateRelicStore((state) => state.randomizeStat);
  const randomizeRolls = useCreateRelicStore((state) => state.randomizeRolls);
  const updateSubStat = useCreateRelicStore((state) => state.updateSubStat);
  const removeSubRoll = useCreateRelicStore((state) => state.removeSubRoll);
  const addSubRoll = useCreateRelicStore((state) => state.addSubRoll);

  const totalUpgradesUsed = relic.sub_affixes.reduce(
    (prev, curr) => prev + Math.max(0, (curr.count ?? 1) - 1),
    0,
  );

  const getCurrentSubAffix = (index: number, affixId: number) => {
    if (!subAffixes || !relic.sub_affixes[index].sub_affix_id) return;

    return subAffixes[5][affixId];
  };

  return (
    <div>
      <div className="mb-2 flex justify-between">
        <div className="flex gap-2">
          <div>
            <p className="text-xl font-semibold">Sub Stat</p>
            <p className="text-xs text-muted-foreground">
              Upgrades: {totalUpgradesUsed}/5
            </p>
          </div>
          <div className="space-x-1">
            <Button
              disabled={!mainAffixProperty}
              onClick={() => randomizeStat(mainAffixProperty ?? "", subAffixes)}
            >
              Random Stats
            </Button>
            <Button
              disabled={!mainAffixProperty}
              variant={"outline"}
              onClick={() => randomizeRolls()}
            >
              Random Rolls
            </Button>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => {
          const isMaxUpgrade = totalUpgradesUsed >= 5;

          const currentAffixId = relic.sub_affixes[i].sub_affix_id || 0;
          const currentCount = relic.sub_affixes[i].count || 0;
          const currentStep = relic.sub_affixes[i].steps || [];
          const currentSubAffixData = getCurrentSubAffix(i, currentAffixId);
          const totalValue = calculateSubAffixValue(
            currentSubAffixData?.BaseValue.Value ?? 0,
            currentSubAffixData?.StepValue.Value ?? 0,
            currentStep ?? [],
            currentCount ?? 0,
          );

          return (
            <React.Fragment key={i}>
              {i !== 0 && <div className="h-px bg-primary" />}
              <div className="flex items-center justify-between">
                {/* SELECT */}
                <div>
                  <div className="flex items-center gap-1">
                    <Select
                      value={String(relic.sub_affixes[i].sub_affix_id || "")}
                      onValueChange={(val) => {
                        updateSubStat(i, {
                          sub_affix_id: Number(val),
                          count: 1,
                          steps: [1],
                        });
                      }}
                    >
                      <SelectTrigger
                        disabled={!mainAffixProperty}
                        className="w-52"
                      >
                        <SelectValue placeholder="Select Sub Stat" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectGroup>
                          {subAffixes &&
                            Object.values(subAffixes[5] ?? {}).map((item) => {
                              return (
                                <SelectItem
                                  disabled={
                                    item.Property === mainAffixProperty ||
                                    relic.sub_affixes.some(
                                      (r) => r.sub_affix_id === item.AffixID,
                                    )
                                  }
                                  key={item.Property}
                                  value={String(item.AffixID)}
                                >
                                  {statPorperties?.[item.Property].name}{" "}
                                  {isPercent(item.Property) ? "%" : ""}
                                </SelectItem>
                              );
                            })}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button
                      variant={"destructive"}
                      size={"icon-sm"}
                      onClick={() => removeSubRoll(i)}
                    >
                      <Minus />
                    </Button>
                  </div>
                  <p className="text-xs ml-1 mt-1 text-muted-foreground">
                    Roll: {currentCount}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {currentSubAffixData && (
                    <p>
                      {isPercent(currentSubAffixData!.Property)
                        ? `${(totalValue * 100).toFixed(1)}%`
                        : totalValue.toFixed(1)}
                    </p>
                  )}
                  {relic.sub_affixes[i].sub_affix_id && (
                    <ButtonGroup>
                      {Array.from({ length: 3 }).map((_, idxBtn) => {
                        const oneRollValue =
                          (currentSubAffixData?.BaseValue.Value ?? 0) +
                          idxBtn * (currentSubAffixData?.StepValue.Value ?? 0);
                        const nextValue = totalValue + oneRollValue;
                        const percent = isPercent(
                          currentSubAffixData?.Property ?? "",
                        );

                        return (
                          <Button
                            disabled={
                              !relic.sub_affixes[i].sub_affix_id || isMaxUpgrade
                            }
                            key={`${i} - ${idxBtn}`}
                            onClick={() => {
                              addSubRoll(i, idxBtn);
                            }}
                          >
                            {percent
                              ? `${(nextValue * 100).toFixed(1)}%`
                              : nextValue.toFixed(1)}
                          </Button>
                        );
                      })}
                    </ButtonGroup>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default SubAffixCreateRelic;
