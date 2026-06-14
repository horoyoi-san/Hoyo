import { useMemo } from "react";
import { useLightcones } from "../../hooks/use-lightcones.hook";
import { useUserStore } from "@/src/store/use-user.store";
import { DEFAULT_CHAR_CONFIG } from "@/src/utils/constants";
import { useCharacterStore } from "../../store/use-character.store";
import { Tooltip } from "@/src/components/ui/tooltip-card";
import { useParsedDesc } from "@/src/hooks/use-parsed-desc.hook";
import Image from "next/image";
import { Separator } from "@/src/components/ui/separator";
import { imgUrl } from "@/src/utils/helpers";

const LightconeShowcase = () => {
  const { data: allLightcones } = useLightcones();
  const charId = useCharacterStore((state) => state.id);
  const parseDesc = useParsedDesc();

  const charConfig = useUserStore(
    (state) => state.characters[charId as string] ?? DEFAULT_CHAR_CONFIG,
  );

  const lightconeData = useMemo(() => {
    if (!allLightcones) return;

    return allLightcones[charConfig?.lightcone.id as number];
  }, [allLightcones, charConfig?.lightcone.id]);

  return (
    <>
      {charConfig.lightcone.id && lightconeData ? (
        <div className="flex gap-4 items-center">
          {/* Lightcone Image */}
          <Tooltip
            content={
              <div className="max-w-xs space-y-1">
                <p className="font-bold text-primary">{lightconeData.name}</p>
                <p
                  className="text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: parseDesc(
                      lightconeData.rank.desc as string,
                      lightconeData.rank.params[
                        charConfig.lightcone.rank - 1 < 0
                          ? 0
                          : charConfig.lightcone.rank - 1
                      ] as number[],
                    ),
                  }}
                />
              </div>
            }
          >
            <Image
              unoptimized
              width={256}
              height={256}
              src={imgUrl(
                String(charConfig.lightcone.id),
                "lightconemediumicon",
                false,
              )}
              alt={String(lightconeData.name) ?? "Lightcone"}
              className="-rotate-12 w-16"
            />
          </Tooltip>

          {/* Lightcone Info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-lg font-bold truncate tracking-wider">
              {lightconeData.name ?? "No Lightcone"}
            </p>

            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-medium">Level</span>
                <span className="font-bold">
                  Lv. {charConfig.lightcone.level}
                </span>
              </div>

              <Separator orientation="vertical" className="h-8 bg-white/10" />

              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-medium">
                  Superimpose
                </span>
                <span className="font-bold text-secondary">
                  S{charConfig.lightcone.rank}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-24 flex justify-center items-center">
          <p className="text-xs italic">no lightcone.</p>
        </div>
      )}
    </>
  );
};

export default LightconeShowcase;
