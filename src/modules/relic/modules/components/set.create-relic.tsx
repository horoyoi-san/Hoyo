import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/src/components/ui/combobox";
import { useMemo } from "react";
import { ORNAMENTS } from "../utils/constants";
import { useGetRelicSets } from "../../hooks/use-get-relic-sets.hook";
import { useCreateRelicStore } from "../store/use-create-relic.store";
import { useGetRelics } from "../../hooks/use-get-relics.hook";
import { RelicSet } from "../../types/relic-set.type";

const SetCreateRelic = () => {
  const relic = useCreateRelicStore((state) => state.relic);
  const updateRelic = useCreateRelicStore((state) => state.updateRelic);
  const { data: allRelics, isPending: isPendingAllRelics } = useGetRelics();
  const { data: allRelicSets, isPending: isPendingRelicSets } =
    useGetRelicSets();

  const filteredRelicSets = useMemo(() => {
    if (!allRelicSets) return [];

    const allSets = Object.values(allRelicSets);

    const isOrnament = ORNAMENTS.map((o) => o).includes(relic.type as string);

    if (isOrnament) {
      return allSets
        .filter((set) => set.id.toString().startsWith("3"))
        .reverse();
    } else {
      return allSets
        .filter((set) => set.id.toString().startsWith("1"))
        .reverse();
    }
  }, [allRelicSets, relic.type]);

  return (
    <>
      <label htmlFor="relic-set">Set</label>
      <Combobox
        items={filteredRelicSets}
        value={
          filteredRelicSets.find((s) => s.id === relic.relic_set_id) || null
        }
        disabled={
          isPendingRelicSets ||
          isPendingAllRelics ||
          filteredRelicSets.length === 0 ||
          !relic.type
        }
        itemToStringLabel={(item: RelicSet) => item.name}
        itemToStringValue={(item) => String(item.id)}
        onValueChange={(relicSet) => {
          const relicData = Object.values(allRelics ?? {}).find(
            (data) =>
              data.set_id === relicSet?.id &&
              data.rarity === 5 &&
              relic.type === data.type,
          );

          updateRelic({
            relic_set_id: relicSet?.id,
            relic_id: relicData?.id,
          });
        }}
      >
        <ComboboxInput id="relic-set" placeholder="Select relic set" />
        <ComboboxContent>
          <ComboboxEmpty>No relics found.</ComboboxEmpty>
          <ComboboxList>
            {(item) => (
              <ComboboxItem
                key={item.id}
                value={item}
                className={"flex items-center gap-2 py-2"}
              >
                <img
                  src={item.icon}
                  alt={item.name}
                  className="size-6 shrink-0"
                />
                <span className="line-clamp-2">{item.name}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </>
  );
};

export default SetCreateRelic;
