
import { useTranslation } from "@/src/hooks/use-translation.hook";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Separator } from "@/src/components/ui/separator";
import { Slider } from "@/src/components/ui/slider";
import { Button } from "@/src/components/ui/button";
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
  const { t } = useTranslation();
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
      <div className="space-y-4 shrink-0 overflow-y-auto overflow-x-hidden pr-4 custom-scrollbar h-full min-h-0 w-[45%]">
        <p className="mb-4 text-4xl font-bold">{t("character")}</p>
        <div className="space-y-4">
          <div className="space-y-4 px-4">
            <label
              htmlFor="lv"
              className="flex items-center gap-1 justify-between w-full"
            >
              <span className="text-xl font-semibold">{t("level")}</span>
              <div className="flex gap-2 items-center">
                <InputNumber
                  id="lv"
                  className="w-16 border-white/[0.1]"
                  placeholder={t("level")}
                  value={charConfig.level}
                  onChange={(val) => {
                    updateChar(Number(id), {
                      level: val,
                    });
                  }}
                />
                <Button variant="secondary" size="sm" onClick={() => updateChar(Number(id), { level: 80 })}>{t("max")}</Button>
              </div>
            </label>
            <Slider
              min={1}
              max={80}
              value={[charConfig.level]}
              onValueChange={([val]) => {
                updateChar(Number(id), { level: val });
              }}
            />
          </div>
          <div className="space-y-4 px-4 mt-6">
            <div className="flex gap-2">
              <label
                htmlFor="energy"
                className="flex items-center gap-1 justify-between w-full"
              >
                <span className="text-xl font-semibold">{t("energy")}</span>
                <div className="flex gap-2 items-center">
                  <InputNumber
                    id="energy"
                    className="w-16 border-white/[0.1]"
                    value={isTingyun ? 90 : charConfig.sp}
                    disabled={isTingyun}
                    onChange={(val) => {
                      updateChar(Number(id), {
                        sp: val,
                      });
                    }}
                  />
                  <Button disabled={isTingyun} variant="secondary" size="sm" onClick={() => updateChar(Number(id), { sp: 50 })}>{t("setTo50")}</Button>
                </div>
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
            className="text-lg flex items-center gap-1 border-y py-4 border-white/[0.06] px-4"
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
            <span>{t("useTechnique")}</span>
          </label>
        </div>
        {Object.keys(charData?.skills_enhanced || {}).length > 0 && (
          <label
            htmlFor="use-enhanced"
            className="text-lg flex items-center gap-2 border-y py-4 border-white/[0.06] px-4"
          >
            <Checkbox
              id="use-enhanced"
              className="bg-foreground"
              checked={!!charConfig.enhanced}
              onCheckedChange={(val) => {
                updateChar(Number(id), { enhanced: val ? "true" : null });
              }}
            />
            <span className="font-semibold text-white/80">{t("enhancedState")}</span>
          </label>
        )}
      </div>

      <Separator
        orientation="vertical"
        className="data-vertical:w-0.5 bg-white/[0.06] data-vertical:mx-6"
      />

      {/* LIGHTCONE */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-4 custom-scrollbar h-full min-h-0">
        <p className="mb-4 text-4xl font-bold">{t("lightcone")}</p>
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
              <div className="space-y-6 w-full">
                <div className="space-y-4">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-lg">{t("level")}</span>
                    <div className="flex gap-2 items-center">
                      <InputNumber
                        id="lv-lightcone"
                        placeholder={t("level")}
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
                        className="w-16 border-white/[0.1]"
                      />
                      <Button variant="secondary" size="sm" onClick={() => updateChar(Number(id), { lightcone: { ...charConfig.lightcone, level: 80 } })}>{t("max")}</Button>
                    </div>
                  </div>
                  <Slider
                    min={1}
                    max={80}
                    value={[charConfig.lightcone.level]}
                    onValueChange={([val]) => {
                      updateChar(Number(id), {
                        lightcone: { ...charConfig.lightcone, level: val },
                      });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <span className="font-semibold text-lg">{t("superimpositionRank")}</span>
                  <div className="flex gap-2 w-full justify-between">
                    {[1, 2, 3, 4, 5].map((rank) => (
                      <Button
                        key={rank}
                        variant={charConfig.lightcone.rank === rank ? "default" : "outline"}
                        className={`flex-1 ${charConfig.lightcone.rank === rank ? "bg-white text-black hover:bg-white/90" : "border-white/20 text-white"}`}
                        onClick={() => {
                          updateChar(Number(id), {
                            lightcone: {
                              ...charConfig.lightcone,
                              rank: rank,
                            },
                          });
                        }}
                      >
                        S{rank}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CharacterTab;
