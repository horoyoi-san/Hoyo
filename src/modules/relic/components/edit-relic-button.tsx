import { Button } from "@/src/components/ui/button";
import { RelicConfigStore } from "@/src/store/types";
import { Pencil } from "lucide-react";
import {
  CreateRelicType,
  useCreateRelicStore,
} from "../modules/store/use-create-relic.store";
import { useRouter } from "next/navigation";

interface Props {
  item: RelicConfigStore;
}

const EditRelicButton = ({ item }: Props) => {
  const updateRelic = useCreateRelicStore((state) => state.updateRelic);
  const router = useRouter();

  return (
    <Button
      size="icon-sm"
      onClick={(e) => {
        e.stopPropagation();

        const buildSubAffixes: CreateRelicType["sub_affixes"] =
          item.sub_affixes.map((sub) => {
            let remainingStep = sub.step;

            const stepsArr = Array.from({ length: sub.count || 1 }, () => {
              const val = Math.min(2, Math.max(0, remainingStep));
              remainingStep -= val;
              return val;
            });

            return {
              sub_affix_id: sub.sub_affix_id,
              count: sub.count,
              steps: stepsArr,
            };
          });

        while (buildSubAffixes.length < 4) {
          buildSubAffixes.push({
            sub_affix_id: undefined,
            count: undefined,
            steps: undefined,
          });
        }

        updateRelic({
          id: item.id,
          equipped_by: item.equipped_by || [],
          relic_id: item.relic_id,
          relic_set_id: item.relic_set_id,
          type: item.type,
          level: item.level,
          main_affix_id: item.main_affix_id,
          sub_affixes: buildSubAffixes,
        });

        router.push("/relic/create");
      }}
    >
      <Pencil />
    </Button>
  );
};

export default EditRelicButton;
