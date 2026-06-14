import { useUserStore } from "@/src/store/use-user.store";
import { useGetRelics } from "../hooks/use-get-relics.hook";
import { LayoutGrid } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { ButtonGroup } from "@/src/components/ui/button-group";
import { cn } from "@/src/lib/utils";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/src/components/ui/combobox";
import { useGetRelicSets } from "../hooks/use-get-relic-sets.hook";
import { RelicSet } from "../types/relic-set.type";
import { RELIC_TYPES } from "../utils/constants";
import Image from "next/image";
import { useCharacters } from "../../character/hooks/use-characters.hook";
import { CharacterDetails } from "../../character/utils/character-detail.type";
import VirtualizedList from "./virtualized-list";
import { useParsedDesc } from "@/src/hooks/use-parsed-desc.hook";

interface Props {
  onSelect?: (relicId: string, type: string) => void;
  withDelete?: boolean;
  emptyClassName?: string;
  type?: string;
}

const RelicList = ({
  onSelect,
  withDelete = true,
  emptyClassName,
  type,
}: Props) => {
  const anchorSet = useComboboxAnchor();
  const anchorEquip = useComboboxAnchor();
  const [selectedType, setSelectedType] = useState(type || "all");
  const [selectedSet, setSelectedSet] = useState<RelicSet[]>([]);
  const [selectedEquipped, setSelectedEquipped] = useState<CharacterDetails[]>(
    [],
  );

  const { data: allCharacters } = useCharacters();
  const { data: allRellics } = useGetRelics();
  const { data: relicSets } = useGetRelicSets();
  const relicList = useUserStore((state) => state.relics);

  const parseDesc = useParsedDesc();

  const filteredRelics = useMemo(() => {
    return Object.values(relicList).filter((item) => {
      const matchesType =
        selectedType === "all" ||
        item.type.toLowerCase() === selectedType.toLowerCase();

      const matchesSet =
        selectedSet.length === 0 ||
        selectedSet.some((set) => set.id === item.relic_set_id);

      const matchesEquip =
        selectedEquipped.length === 0 ||
        selectedEquipped.some((equip) =>
          item.equipped_by?.some((r) => r === equip.id),
        );

      return matchesType && matchesSet && matchesEquip;
    });
  }, [relicList, selectedType, selectedSet, selectedEquipped]);

  const parentRef = useRef<HTMLDivElement>(null);
  const COLUMNS = 7;
  const rows = useMemo(() => {
    const r = [];
    for (let i = 0; i < filteredRelics.length; i += COLUMNS) {
      r.push(filteredRelics.slice(i, i + COLUMNS));
    }
    return r;
  }, [filteredRelics]);

  if (!allRellics) return;

  return (
    <>
      <div className="flex flex-wrap gap-2 pb-4">
        <ButtonGroup>
          {RELIC_TYPES.map((type) => (
            <Button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-lg transition-all capitalize text-foreground ${
                selectedType === type
                  ? "bg-background shadow-md"
                  : "bg-primary hover:bg-primary"
              }`}
            >
              {type === "all" ? (
                <LayoutGrid size={28} />
              ) : (
                <Image
                  width={24}
                  height={24}
                  src={`/icons/part/part${type}.webp`}
                  alt={type}
                  className="size-6"
                />
              )}
            </Button>
          ))}
        </ButtonGroup>
        <Combobox
          multiple
          autoHighlight
          value={selectedSet}
          onValueChange={(values) => setSelectedSet(values)}
          items={Object.values(relicSets ?? {}).reverse()}
          itemToStringLabel={(item: RelicSet) => item.name}
          itemToStringValue={(item) => String(item.id)}
        >
          <ComboboxChips ref={anchorSet} className={"w-full max-w-xs"}>
            <ComboboxValue>
              {(values) => {
                return (
                  <>
                    {values.map((value: RelicSet) => {
                      return (
                        <ComboboxChip key={value.id}>{value.name}</ComboboxChip>
                      );
                    })}
                    <ComboboxChipsInput placeholder="Filter by set..." />
                  </>
                );
              }}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={anchorSet}>
            <ComboboxEmpty>No relic sets found.</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem
                  key={item.id}
                  value={item}
                  className={"flex items-center gap-2 py-2"}
                >
                  <Image
                    width={24}
                    height={24}
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
        <Combobox
          multiple
          autoHighlight
          value={selectedEquipped}
          onValueChange={(values) => setSelectedEquipped(values)}
          items={Object.values(allCharacters ?? {}).reverse()}
          itemToStringLabel={(item: CharacterDetails) => item.name}
          itemToStringValue={(item) => String(item.id)}
        >
          <ComboboxChips ref={anchorEquip} className={"w-full max-w-xs"}>
            <ComboboxValue>
              {(values) => {
                return (
                  <>
                    {values.map((value: RelicSet) => {
                      return (
                        <ComboboxChip key={value.id}>
                          <Image
                            width={24}
                            height={24}
                            src={`https://fribbels.github.io/hsr-optimizer/assets/icon/avatar/${value.id}.webp`}
                            alt={value.name}
                            className="size-6 shrink-0"
                          />
                        </ComboboxChip>
                      );
                    })}
                    <ComboboxChipsInput placeholder="Filter by character..." />
                  </>
                );
              }}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={anchorEquip}>
            <ComboboxEmpty>No character sets found.</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem
                  key={item.id}
                  value={item}
                  className={"flex items-center gap-2 py-2"}
                >
                  <Image
                    width={24}
                    height={24}
                    src={`https://fribbels.github.io/hsr-optimizer/assets/icon/avatar/${item.id}.webp`}
                    alt={item.name}
                    className="size-6 shrink-0"
                  />
                  <span
                    className="line-clamp-2"
                    dangerouslySetInnerHTML={{
                      __html: parseDesc(item.name, []),
                    }}
                  />
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
      {filteredRelics.length > 0 ? (
        <VirtualizedList
          parentRef={parentRef}
          rows={rows}
          onSelect={onSelect}
          withDelete={withDelete}
        />
      ) : (
        <div
          className={cn(
            `col-span-7 py-20 text-center text-muted-foreground`,
            emptyClassName,
          )}
        >
          No relics found.
        </div>
      )}
    </>
  );
};

export default RelicList;
