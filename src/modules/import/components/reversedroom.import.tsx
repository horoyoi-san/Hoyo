import { useState, useRef } from "react";
import { Button } from "@/src/components/ui/button";
import { useUserStore } from "@/src/store/use-user.store";
import { Separator } from "@/src/components/ui/separator";
import { toast } from "sonner";
import { decodeRelicString, importConfigJsonParser } from "../utils/helpers";
import { useCharacters } from "../../character/hooks/use-characters.hook";
import { useLightcones } from "../../character/hooks/use-lightcones.hook";
import { Tooltip } from "@/src/components/ui/tooltip-card";
import { calculateSubAffixValue, isPercent } from "@/src/utils/helpers";
import { REVERSE_SLOT_MAP } from "../utils/constants";
import { useGetRelics } from "../../relic/hooks/use-get-relics.hook";
import { useGetMainAffixes } from "../../relic/hooks/use-get-main-affixes.hook";
import { useGetSubAffixes } from "../../relic/hooks/use-get-sub-affixes.hook";
import { useGetStatProperties } from "../../relic/hooks/use-get-stat-properties.hook";
import { useParsedDesc } from "@/src/hooks/use-parsed-desc.hook";

const ReversedRoom = () => {
  const [tempData, setTempData] = useState<any>(null);
  const [selectedCharIds, setSelectedCharIds] = useState<number[]>([]);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        toast.error("Invalid JSON format");
      }
    };
    reader.readAsText(file);
  };

  const toggleChar = (id: number) => {
    setSelectedCharIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
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
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Import from config.json</h2>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            Choose JSON File
          </Button>
          {tempData && (
            <Button variant="ghost" onClick={reset}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {tempData && (
        <div className="space-y-4">
          <Separator />
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Select Characters to Restore</h3>
            <p className="text-xs text-muted-foreground italic">
              Found {tempData.avatar_config.length} characters
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {tempData.avatar_config.map((char: any) => {
              if (!allCharacters || !allLightcones) return;
              const isSelected = selectedCharIds.includes(Number(char.id));

              const charData = allCharacters[char.id];
              const lightconeData = allLightcones[char.lightcone.id];
              return (
                <div
                  key={char.id}
                  className={`flex gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                    isSelected
                      ? "border-secondary bg-secondary/10"
                      : "opacity-60"
                  }`}
                  onClick={() => toggleChar(Number(char.id))}
                >
                  <img
                    src={`https://fribbels.github.io/hsr-optimizer/assets/icon/avatar/${char.id}.webp`}
                    className="w-10 h-10 rounded-full"
                    alt={char.name}
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2 items-center">
                      <p
                        className="font-medium"
                        dangerouslySetInnerHTML={{
                          __html: parseDesc(charData.name, []),
                        }}
                      />{" "}
                      <span className="text-xs text-muted-foreground shrink-0">
                        E{char.rank} Lv.{char.level}
                      </span>
                    </div>
                    {char.lightcone?.id && !isPendingAllLightcones ? (
                      <div className="flex gap-2">
                        <img
                          src={`https://fribbels.github.io/hsr-optimizer/assets/image/light_cone_portrait/${char.lightcone.id}.webp`}
                          alt={char.lightcone.name}
                          className="h-24"
                        />
                        <div className="text-xs text-muted-foreground">
                          <p className="text-white line-clamp-2">
                            {lightconeData.name ?? "None"}
                          </p>
                          <p>Lv. {char.lightcone.level}</p>
                          <p>Superimpose {char.lightcone.rank}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        no lightcone.
                      </p>
                    )}
                    {char.relics.length > 0 ? (
                      <div className="flex gap-2">
                        {char.relics.map((relic: string) => {
                          if (
                            !allRelics ||
                            !mainAffixes ||
                            !subAffixes ||
                            !statProperties
                          )
                            return;

                          const decodedRelic = decodeRelicString(relic);
                          const relicData = allRelics[decodedRelic.relic_id];
                          const mainAffixData =
                            mainAffixes[relicData.main_affix_id][
                              decodedRelic.main_affix_id
                            ];
                          const mainAffixValue =
                            mainAffixData.BaseValue.Value +
                            decodedRelic.level * mainAffixData.LevelAdd.Value;

                          return (
                            <Tooltip
                              key={`${decodedRelic.relic_id} - ${relicData.name} - ${charData.id}`}
                              contentClassName="min-w-32 max-w-72"
                              content={
                                <div className="space-y-2">
                                  <p className="text-primary font-medium">
                                    {relicData.name}
                                  </p>
                                  <div className="text-xs flex justify-between">
                                    <p>
                                      {
                                        statProperties[mainAffixData.Property]
                                          .name
                                      }
                                    </p>
                                    <p>
                                      {isPercent(mainAffixData.Property)
                                        ? `${(mainAffixValue * 100).toFixed(1)}%`
                                        : `${mainAffixValue.toFixed(0)}`}
                                    </p>
                                  </div>
                                  <Separator />
                                  <div>
                                    {decodedRelic.sub_affixes.map((sub) => {
                                      const subData =
                                        subAffixes[5][sub.sub_affix_id];
                                      const subValue = calculateSubAffixValue(
                                        subData.BaseValue.Value,
                                        subData.StepValue.Value,
                                        sub.step,
                                        sub.count,
                                      );

                                      return (
                                        <div
                                          key={`${decodedRelic.relic_id} - ${relicData.name} - ${subData.Property} - ${charData.id}`}
                                          className="text-xs flex justify-between gap-4"
                                        >
                                          <p>
                                            {
                                              statProperties[subData.Property]
                                                .name
                                            }
                                          </p>
                                          <p>
                                            {isPercent(subData.Property)
                                              ? `${(subValue * 100).toFixed(1)}%`
                                              : `${subValue.toFixed(1)}`}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              }
                            >
                              <img
                                src={`https://cdn.neonteam.dev/neonteam/assets/spriteoutput/relicfigures/IconRelic_${decodedRelic.relic_set_id}_${REVERSE_SLOT_MAP[decodedRelic.type]}.webp`}
                                alt={decodedRelic.relic_id.toString()}
                                className="size-8"
                              />
                            </Tooltip>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        no relics.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              onClick={handleProcessImport}
              disabled={selectedCharIds.length === 0}
            >
              Import Selected ({selectedCharIds.length})
            </Button>
            <Button variant="outline" onClick={reset}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReversedRoom;
