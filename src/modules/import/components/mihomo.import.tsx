import { InputNumber } from "@/src/components/input/InputNumber";
import { Button } from "@/src/components/ui/button";
import { useUserStore } from "@/src/store/use-user.store";
import { BASE_URL } from "@/src/utils/constants";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { mihomoToStoreParser } from "../utils/helpers";
import { ResponseMihomo } from "../types/response-mihomo.type";
import { toast } from "sonner";
import { Tooltip } from "@/src/components/ui/tooltip-card";
import { isPercent } from "@/src/utils/helpers";
import { Separator } from "@/src/components/ui/separator";

const Mihomo = () => {
  const [uid, setUid] = useState(0);
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
    setUid(0);
  };

  const toggleChar = (id: number) => {
    setSelectedCharIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Import from mihomo</h2>
        <p>
          Only characters currently displayed in your in-game Profile Showcase
          can be imported.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!uid) return;

            mutation.mutate(uid);
          }}
          className="flex gap-2"
        >
          <InputNumber
            placeholder="UID..."
            value={uid}
            onChange={(v) => setUid(v)}
          />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Fetching..." : "Fetch Profile"}
          </Button>
        </form>
      </div>

      {mutation.data && (
        <div className="space-y-4">
          <Separator />
          <div className="flex justify-between items-center pb-2">
            <h3 className="font-semibold">Select Characters to Import</h3>
            <p className="text-sm text-muted-foreground">
              {mutation.data.player.nickname}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {mutation.data.characters.map((char) => {
              return (
                <div
                  key={char.id}
                  className={`flex gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                    selectedCharIds.includes(Number(char.id))
                      ? "border-secondary bg-secondary/10"
                      : "opacity-60"
                  }`}
                  onClick={() => toggleChar(Number(char.id))}
                >
                  <img
                    src={`https://fribbels.github.io/hsr-optimizer/assets/icon/avatar/${char.id}.webp`}
                    className="w-12 h-12 rounded-full"
                    alt={char.name}
                  />
                  <div className="flex-1 space-y-2">
                    <p className="font-medium">
                      {char.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        E{char.rank} Lv.{char.level}
                      </span>
                    </p>
                    {char.light_cone?.id ? (
                      <div className="flex gap-2">
                        <img
                          src={`https://fribbels.github.io/hsr-optimizer/assets/image/light_cone_portrait/${char.light_cone.id}.webp`}
                          alt={char.light_cone.name}
                          className="h-24"
                        />
                        <div className="text-xs text-muted-foreground">
                          <p className="text-white line-clamp-2">
                            {char.light_cone?.name || "None"}
                          </p>
                          <p>Lv. {char.light_cone.level}</p>
                          <p>Superimpose {char.light_cone.rank}</p>
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
                                    <p>{relic.main_affix.name}</p>
                                    <p>
                                      {isPercent(relic.main_affix.type)
                                        ? `${(relic.main_affix.value * 100).toFixed(1)}%`
                                        : `${relic.main_affix.value.toFixed(0)}`}
                                    </p>
                                  </div>
                                  <Separator />
                                  <div>
                                    {relic.sub_affix.map((sub) => {
                                      return (
                                        <div
                                          key={`${relic.name} - ${relic.id} - ${sub.value.toString()} - ${sub.field} - ${char.id}`}
                                          className="text-xs flex justify-between gap-4"
                                        >
                                          <p>{sub.name}</p>
                                          <p>
                                            {isPercent(sub.type)
                                              ? `${(sub.value * 100).toFixed(1)}%`
                                              : `${sub.value.toFixed(1)}`}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              }
                            >
                              <img
                                src={`https://cdn.neonteam.dev/neonteam/assets/spriteoutput/relicfigures/IconRelic_${relic.set_id}_${relic.type}.webp`}
                                alt={relic.name}
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
              onClick={handleImport}
              disabled={selectedCharIds.length === 0}
            >
              Import Selected ({selectedCharIds.length})
            </Button>
            <Button variant="outline" onClick={() => mutation.reset()}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mihomo;
