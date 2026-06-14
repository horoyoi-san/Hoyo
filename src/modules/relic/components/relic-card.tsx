
import { useTranslation } from "@/src/hooks/use-translation.hook";
import { RelicConfigStore } from "@/src/store/types";
import { calculateSubAffixValue, imgUrl, isPercent } from "@/src/utils/helpers";
import { ChevronRight } from "lucide-react";
import { useGetRelics } from "../hooks/use-get-relics.hook";
import { useGetStatProperties } from "../hooks/use-get-stat-properties.hook";
import { useGetMainAffixes } from "../hooks/use-get-main-affixes.hook";
import { useGetSubAffixes } from "../hooks/use-get-sub-affixes.hook";
import Image from "next/image";
import { cn } from "@/src/lib/utils";
import { Tooltip } from "@/src/components/ui/tooltip-card";
import { memo } from "react";

interface RelicCardProps {
  relic: RelicConfigStore;
  onClick?: () => void;
  className?: string;
  renderAction?: React.ReactNode;
  showEquippedBy?: boolean;
}

const RelicCard = ({
  relic,
  onClick,
  className,
  renderAction,
  showEquippedBy = false,
}: RelicCardProps) => {
  const { t } = useTranslation();
  const { data: allRelicData } = useGetRelics();
  const { data: statProperties } = useGetStatProperties();
  const { data: mainAffixes } = useGetMainAffixes();
  const { data: subAffixes } = useGetSubAffixes();

  const relicData = allRelicData?.[relic.relic_id];
  const mainStatGroup = mainAffixes?.[relicData?.main_affix_id ?? 0];
  const mainStatInfo = mainStatGroup?.[relic.main_affix_id];
  const mainProp = mainStatInfo?.Property ?? "";

  const mainValue = mainStatInfo
    ? mainStatInfo.BaseValue.Value + relic.level * mainStatInfo.LevelAdd.Value
    : 0;

  if (!relicData) return;

  return (
    <div
      className={cn(
        "rounded-xl h-full overflow-hidden flex flex-col relative group will-change-transform duration-200 text-foreground",
        onClick && "cursor-pointer hover:ring-1 ring-white/20",
        className,
      )}
      onClick={onClick}
    >
      {showEquippedBy && relic.equipped_by && relic.equipped_by.length > 0 && (
        <Tooltip
          contentClassName="bg-card/80 backdrop-blur-sm min-w-fit"
          content={
            <div className="text-foreground space-y-2">
              <p>{t("equipped")}</p>
              <div className="flex gap-1 flex-wrap">
                {relic.equipped_by.map((charId) => {
                  return (
                    <Image
                      key={charId}
                      unoptimized
                      width={52}
                      height={52}
                      src={`https://fribbels.github.io/hsr-optimizer/assets/icon/avatar/${charId}.webp`}
                      alt={charId.toString()}
                      className="rounded-full border-2 border-white/20 object-cover"
                    />
                  );
                })}
              </div>
            </div>
          }
        >
          <div className="absolute top-2 left-2 z-10 -space-x-3 flex">
            {relic.equipped_by.slice(0, 3).map((charId, idx) => (
              <Image
                key={idx}
                unoptimized
                width={32}
                height={32}
                src={`https://fribbels.github.io/hsr-optimizer/assets/icon/avatar/${charId}.webp`}
                alt={charId.toString()}
                className="rounded-full border-2 border-white/[0.1] backdrop-blur-sm object-cover"
              />
            ))}
            {relic.equipped_by.length > 3 && (
              <div className="flex items-center justify-center size-8 rounded-full border-2 border-white/[0.1] bg-muted text-[10px] font-bold z-10 text-muted-foreground">
                +{relic.equipped_by.length - 3}
              </div>
            )}
          </div>
        </Tooltip>
      )}
      {renderAction && (
        <div
          className="absolute top-2 right-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {renderAction}
        </div>
      )}

      {/* Header */}
      <div className="p-3 flex bg-white/[0.03] flex-col items-center shrink-0 relative">
        <Image
          unoptimized
          width={64}
          height={64}
          src={imgUrl(relicData.icon, "relicfigures")}
          alt={relicData.name ?? "Relic"}
          className="drop-shadow-md"
        />
        <p className="text-[10px] font-bold text-center leading-tight mt-2 line-clamp-1 tracking-wide">
          {relicData?.name}
        </p>
      </div>

      {/* Stats Body */}
      <div className="p-3 space-y-3 bg-white/[0.02] flex-1 flex flex-col justify-between">
        {/* Main Stat */}
        <div className="flex justify-between items-center pb-2 gap-2">
          <span className="text-[11px] font-medium uppercase line-clamp-2">
            {statProperties?.[mainProp]?.name}
          </span>
          <span className="text-base font-bold text-foreground">
            {isPercent(mainProp)
              ? `${(mainValue * 100).toFixed(1)}%`
              : Math.floor(mainValue)}
          </span>
        </div>

        {/* Sub Stats */}
        <div className="space-y-1">
          {relic.sub_affixes.map((sub, idx) => {
            const subData = subAffixes?.[relicData.rarity]?.[sub.sub_affix_id];
            if (!subData) return null;

            const val = calculateSubAffixValue(
              subData.BaseValue.Value,
              subData.StepValue.Value,
              sub.step,
              sub.count,
            );

            return (
              <div
                key={idx}
                className="flex justify-between items-center text-[10px]"
              >
                <div className="flex items-center gap-1">
                  <span className="shrink-0">
                    {statProperties?.[subData.Property]?.name}
                  </span>
                  {sub.count > 1 && (
                    <div className="flex -space-x-1.5 text-white/50">
                      {Array.from({ length: sub.count - 1 }).map((_, i) => (
                        <ChevronRight key={i} size={10} strokeWidth={3} />
                      ))}
                    </div>
                  )}
                </div>
                <span className="font-semibold">
                  {isPercent(subData.Property)
                    ? `${(val * 100).toFixed(1)}%`
                    : val.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default memo(RelicCard);
