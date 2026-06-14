import { Textarea } from "@/src/components/ui/textarea";
import { useMemo, useState } from "react";
import { ResponseHoyolab } from "../types/response-hoyolab.type";
import { Separator } from "@/src/components/ui/separator";
import Image from "next/image";
import { Tooltip } from "@/src/components/ui/tooltip-card";
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
import { Info } from "lucide-react";

const Hoyolab = () => {
  const [val, setVal] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const addImportedData = useUserStore((state) => state.addImportedData);
  const { data: allRelics } = useGetRelics();

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
      console.log(`Error while parsing:`, e);
      return null;
    }
  }, [val]);

  const toggleChar = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
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
    <div>
      <div className="space-y-2">
        <div className="flex flex-col gap-2">
          <div className="flex gap-1 items-center">
            <h2 className="text-lg font-bold">Import from Hoyolab</h2>
            <Dialog>
              <Tooltip contentClassName="min-w-fit" content={<p>Tutorial</p>}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 rounded-full"
                  >
                    <Info size={14} className="text-secondary" />
                  </Button>
                </DialogTrigger>
              </Tooltip>
              <DialogContent
                showCloseButton={false}
                className="p-0 overflow-hidden bg-black"
              >
                <VisuallyHidden.Root>
                  <DialogTitle>Tutorial Import</DialogTitle>
                </VisuallyHidden.Root>
                <video
                  src="/tutor.webm"
                  controls
                  className="w-full h-full"
                ></video>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-sm">
            Note: Sub-stat values may vary slightly from in-game stats. All
            upgrades are estimated using average (mid) rolls.
          </p>
        </div>
        <Textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="max-h-24"
        />
      </div>

      {valToJson && (
        <div>
          <Separator />
          <div className="flex justify-between items-center pb-2">
            <h3 className="font-semibold">Select Characters to Import</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {valToJson.data.avatar_list.map((char) => {
              const propertyInfo = valToJson.data.property_info;

              return (
                <div
                  key={char.id}
                  className={`flex gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                    selectedIds.includes(Number(char.id))
                      ? "border-secondary bg-secondary/10"
                      : "opacity-60"
                  }`}
                  onClick={() => toggleChar(Number(char.id))}
                >
                  <Image
                    unoptimized
                    width={52}
                    height={52}
                    src={`https://fribbels.github.io/hsr-optimizer/assets/icon/avatar/${char.id}.webp`}
                    alt={char.name}
                    className="aspect-square size-12 rounded-full"
                  />
                  <div className="flex-1 space-y-2">
                    <p className="font-medium">
                      {char.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        E{char.rank} Lv.{char.level}
                      </span>
                    </p>
                    {char.equip ? (
                      <div className="flex gap-2">
                        <Image
                          unoptimized
                          width={96}
                          height={96}
                          src={`https://fribbels.github.io/hsr-optimizer/assets/image/light_cone_portrait/${char.equip.id}.webp`}
                          alt={char.equip.name}
                        />
                        <div className="text-xs text-muted-foreground">
                          <p className="text-white line-clamp-2">
                            {char.equip.name || "None"}
                          </p>
                          <p>Lv. {char.equip.level}</p>
                          <p>Superimpose {char.equip.rank}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        no lightcone.
                      </p>
                    )}
                    {char.relics.length > 0 ? (
                      <div className="flex gap-2">
                        {char.relics.map((relic) => {
                          const relicSetId = Math.floor(relic.id / 10) % 1000;
                          return (
                            <Tooltip
                              key={relic.id}
                              contentClassName="min-w-32 max-w-72"
                              content={
                                <div className="space-y-2">
                                  <p className="text-primary font-medium">
                                    {relic.name}
                                  </p>
                                  <div className="text-xs flex justify-between">
                                    <p>
                                      {
                                        propertyInfo[
                                          relic.main_property.property_type
                                        ].name
                                      }
                                    </p>
                                    <p>{relic.main_property.value}</p>
                                  </div>
                                  <Separator />
                                  <div>
                                    {relic.properties.map((sub) => {
                                      return (
                                        <div
                                          key={`${char.id} - ${relic.id} - ${sub.property_type} - ${relic.pos}`}
                                          className="text-xs flex justify-between gap-4"
                                        >
                                          <p>
                                            {
                                              propertyInfo[sub.property_type]
                                                .name
                                            }
                                          </p>
                                          <p>{sub.value}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              }
                            >
                              <Image
                                width={32}
                                height={32}
                                src={`https://cdn.neonteam.dev/neonteam/assets/spriteoutput/relicfigures/IconRelic_${relicSetId}_${relic.pos}.webp`}
                                alt={relic.name}
                              />
                            </Tooltip>
                          );
                        })}
                        {char.ornaments.map((relic) => {
                          const relicSetId = Math.floor(relic.id / 10) % 1000;
                          return (
                            <Tooltip
                              key={relic.id}
                              contentClassName="min-w-32 max-w-72"
                              content={
                                <div className="space-y-2">
                                  <p className="text-primary font-medium">
                                    {relic.name}
                                  </p>
                                  <div className="text-xs flex justify-between">
                                    <p>
                                      {
                                        propertyInfo[
                                          relic.main_property.property_type
                                        ].name
                                      }
                                    </p>
                                    <p>{relic.main_property.value}</p>
                                  </div>
                                  <Separator />
                                  <div>
                                    {relic.properties.map((sub) => {
                                      return (
                                        <div
                                          key={`${char.id} - ${relic.id} - ${sub.property_type} - ${relic.pos}`}
                                          className="text-xs flex justify-between gap-4"
                                        >
                                          <p>
                                            {
                                              propertyInfo[sub.property_type]
                                                .name
                                            }
                                          </p>
                                          <p>{sub.value}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              }
                            >
                              <Image
                                width={32}
                                height={32}
                                src={`https://cdn.neonteam.dev/neonteam/assets/spriteoutput/relicfigures/IconRelic_${relicSetId}_${relic.pos}.webp`}
                                alt={relic.name}
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
              onClick={handleImport}
              disabled={selectedIds.length === 0}
            >
              Import Selected ({selectedIds.length})
            </Button>
            <Button variant="outline" onClick={() => setVal("")}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hoyolab;
