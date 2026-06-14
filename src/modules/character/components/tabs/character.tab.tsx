import { Checkbox } from "@/src/components/ui/checkbox";
import { Separator } from "@/src/components/ui/separator";
import { Slider } from "@/src/components/ui/slider";
import LightconeDialog from "../dialog/lightcone-dialog.character";
import { useCharacterStore } from "../../store/use-character.store";
import { useUserStore } from "@/src/store/use-user.store";
import { DEFAULT_CHAR_CONFIG } from "@/src/utils/constants";
import { InputNumber } from "@/src/components/input/InputNumber";
import { useLightcones } from "../../hooks/use-lightcones.hook";
import { Tooltip } from "@/src/components/ui/tooltip-card";
import { useParsedDesc } from "@/src/hooks/use-parsed-desc.hook";
import Image from "next/image";
import { Lock } from "lucide-react";
import { useMemo } from "react";

const CharacterTab = () => {
  const id = useCharacterStore((state) => state.id);
  const isTingyun = id === "1202";
  const charData = useCharacterStore((state) => state.charData);
  const { data: allLightcones, isPending } = useLightcones();
  const parsedDesc = useParsedDesc();

  const charConfig = useUserStore(
    (state) => state.characters[id!] ?? DEFAULT_CHAR_CONFIG,
  );
  const updateChar = useUserStore((state) => state.updateCharacter);

  const ranks = useMemo(() => {
    if (!charData) return;
    const ranks = Object.values(charData.ranks);
    const ranksEnhanced = Object.values(charData.ranks_enhanced);

    return ranksEnhanced.length === 0 ? ranks : ranksEnhanced;
  }, [charData]);

  return (
    <>
      <div className="space-y-4 shrink-0">
        <p className="mb-4 text-4xl font-bold">Character</p>
        <div className="space-y-4">
          <label
            htmlFor="lv"
            className="flex items-center gap-1 justify-between px-4"
          >
            <span className="text-xl font-semibold">Level</span>
            <InputNumber
              id="lv"
              className="w-16 border-secondary"
              placeholder="Level"
              value={charConfig.level}
              onChange={(val) => {
                updateChar(Number(id), {
                  level: val,
                });
              }}
            />
          </label>
          <div className="space-y-2 px-4">
            <div className="flex gap-2">
              <label
                htmlFor="energy"
                className="flex items-center gap-1 justify-between w-full"
              >
                <span className="text-xl font-semibold">Energy</span>
                <InputNumber
                  id="energy"
                  className="w-16 border-secondary"
                  value={isTingyun ? 90 : charConfig.sp}
                  disabled={isTingyun}
                  onChange={(val) => {
                    updateChar(Number(id), {
                      sp: val,
                    });
                  }}
                />
              </label>
            </div>
            <Slider
              min={0}
              max={100}
              value={[isTingyun ? 90 : charConfig.sp]}
              disabled={isTingyun}
              onValueChange={([val]) => {
                updateChar(Number(id), { sp: val });
              }}
            />
          </div>
          <label
            htmlFor="use-technique"
            className="text-lg flex items-center gap-1 border-y-2 py-4 border-secondary px-4"
          >
            <Checkbox
              id="use-technique"
              className="bg-foreground"
              checked={charConfig.use_technique}
              disabled={isTingyun}
              onCheckedChange={(val) => {
                updateChar(Number(id), { use_technique: !!val });
              }}
            />
            <span>Use Technique</span>
          </label>
        </div>
        <div className="space-y-2">
          <p className="font-lg font-semibold">Eidolon</p>
          <div className="flex gap-2 items-center">
            {ranks &&
              ranks.map((rank, index) => {
                const currentRank = charConfig.rank;
                const val = index + 1;

                return (
                  <Tooltip
                    key={rank.id}
                    containerClassName="bg-background/50 p-px rounded-full relative cursor-pointer"
                    content={
                      <div>
                        <p className="font-semibold">{rank.name}</p>
                        <p className="text-xs font-light text-muted-foreground mb-1">
                          Eidolon: {index + 1}
                        </p>
                        <p
                          dangerouslySetInnerHTML={{
                            __html: parsedDesc(rank.desc, rank.params),
                          }}
                        />
                      </div>
                    }
                    onClick={() => {
                      const setToZero = currentRank === val ? 0 : val;

                      updateChar(Number(id), {
                        rank: setToZero,
                      });
                    }}
                  >
                    {currentRank < val && (
                      <div className="absolute bg-black/50 rounded-full size-full flex justify-center items-center">
                        <Lock size={16} strokeWidth={3} />
                      </div>
                    )}
                    <Image
                      unoptimized
                      height={52}
                      width={52}
                      src={rank.icon}
                      alt={`Eidolon ${rank.rank}`}
                      className="w-12"
                    />
                  </Tooltip>
                );
              })}
          </div>
        </div>
      </div>

      <Separator
        orientation="vertical"
        className="data-vertical:w-0.5 bg-secondary data-vertical:mx-6"
      />

      {/* LIGHTCONE */}
      <div className="flex-1">
        <p className="mb-4 text-4xl font-bold">Lightcone</p>
        <div className="flex gap-8">
          <LightconeDialog />
          {!!charConfig.lightcone.id && !isPending && (
            <div className="space-y-8">
              <div className="space-y-2">
                <p className="text-xl font-semibold">
                  {allLightcones?.[charConfig.lightcone.id].name ?? "Lightcone"}
                </p>
                <p
                  dangerouslySetInnerHTML={{
                    __html: parsedDesc(
                      allLightcones?.[charConfig.lightcone.id].rank
                        .desc as string,
                      allLightcones?.[charConfig.lightcone.id].rank.params[
                        charConfig.lightcone.rank - 1 < 0
                          ? 0
                          : charConfig.lightcone.rank - 1
                      ] as number[],
                    ),
                  }}
                />
              </div>
              <div className="flex gap-4 items-center w-full">
                <label
                  htmlFor="lv-lightcone"
                  className="flex gap-1 items-center justify-between"
                >
                  <span>Lv.</span>
                  <InputNumber
                    id="lv-lightcone"
                    placeholder="Level"
                    max={80}
                    value={charConfig.lightcone.level}
                    onChange={(val) => {
                      updateChar(Number(id), {
                        lightcone: {
                          ...charConfig.lightcone,
                          level: val,
                        },
                      });
                    }}
                    className="w-16 border-secondary"
                  />
                </label>
                <label
                  htmlFor="superimpose"
                  className="flex gap-2 items-center"
                >
                  <span>Superimpose</span>
                  <InputNumber
                    id="superimpose"
                    placeholder="Rank"
                    className="w-16 border-secondary"
                    value={charConfig.lightcone.rank}
                    max={5}
                    onChange={(val) => {
                      updateChar(Number(id), {
                        lightcone: {
                          ...charConfig.lightcone,
                          rank: val,
                        },
                      });
                    }}
                    onBlur={() => {
                      if (
                        !charConfig.lightcone.rank ||
                        charConfig.lightcone.rank < 1
                      ) {
                        updateChar(Number(id), {
                          lightcone: {
                            ...charConfig.lightcone,
                            rank: 1,
                          },
                        });
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CharacterTab;
