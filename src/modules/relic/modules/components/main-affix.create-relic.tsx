import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { isPercent } from "@/src/utils/helpers";
import { useCreateRelicStore } from "../store/use-create-relic.store";
import { useGetSubAffixes } from "../../hooks/use-get-sub-affixes.hook";
import { useGetStatProperties } from "../../hooks/use-get-stat-properties.hook";
import { RelicData } from "../../types/all-relics.type";
import { MainAffix } from "../../types/affixes.type";

interface Props {
  currentRelicData?: RelicData;
  currentMainAffixData?: MainAffix;
}

const MainAffixCreateRelic = ({
  currentMainAffixData,
  currentRelicData,
}: Props) => {
  const relic = useCreateRelicStore((state) => state.relic);
  const updateRelic = useCreateRelicStore((state) => state.updateRelic);
  const { data: statPorperties } = useGetStatProperties();
  const { data: subAffixes } = useGetSubAffixes();

  return (
    <>
      <label htmlFor="main-affix">
        <span className="font-medium">Main Stat</span>
        <Select
          value={String(relic.main_affix_id || "")}
          onValueChange={(val) => {
            const newMainId = Number(val);

            const newMainProperty = Object.values(
              currentMainAffixData ?? {},
            ).find((item) => item.AffixID === newMainId)?.Property;

            // CHECK IF THERE IS SOME SUB AFFIX THAT IS SAME WITH MAIN AFFIX
            const cleanedSubAffixes = relic.sub_affixes.map((sub) => {
              if (!subAffixes || !sub.sub_affix_id) return sub;

              const subProperty = subAffixes[5][sub.sub_affix_id]?.Property;

              if (subProperty === newMainProperty) {
                return {
                  sub_affix_id: undefined,
                  count: undefined,
                  step: undefined,
                };
              }

              return sub;
            });

            updateRelic({
              main_affix_id: newMainId,
              sub_affixes: cleanedSubAffixes,
            });
          }}
        >
          <SelectTrigger
            id="main-affix"
            disabled={!currentRelicData?.main_affix_id}
            className="w-full"
          >
            <SelectValue placeholder="Select Main Stat" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectGroup>
              {Object.values(currentMainAffixData ?? {}).map((item) => {
                return (
                  <SelectItem
                    key={`${item.AffixID} - ${item.GroupID}`}
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
      </label>
    </>
  );
};

export default MainAffixCreateRelic;
