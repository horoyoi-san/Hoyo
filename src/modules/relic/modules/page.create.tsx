"use client";

import { useGetRelicSets } from "../hooks/use-get-relic-sets.hook";
import { useGetRelics } from "../hooks/use-get-relics.hook";
import {
  DEFAULT_CREATE_RELIC,
  useCreateRelicStore,
} from "./store/use-create-relic.store";
import { useMemo } from "react";
import { useParsedDesc } from "@/src/hooks/use-parsed-desc.hook";
import { useGetMainAffixes } from "../hooks/use-get-main-affixes.hook";
import TypeCreateRelic from "./components/type.create-relic";
import SetCreateRelic from "./components/set.create-relic";
import MainAffixCreateRelic from "./components/main-affix.create-relic";
import SubAffixCreateRelic from "./components/sub-affix.create-relic";
import { useUserStore } from "@/src/store/use-user.store";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { RelicConfigStore } from "@/src/store/types";

const CreateRelicPage = () => {
  const router = useRouter();

  const addRelic = useUserStore((state) => state.addRelic);
  const editRelic = useUserStore((state) => state.editRelic);

  const updateRelic = useCreateRelicStore((state) => state.updateRelic);
  const relic = useCreateRelicStore((state) => state.relic);

  const parsedDesc = useParsedDesc();

  // DATA
  const { data: allRelics } = useGetRelics();
  const { data: allRelicSets } = useGetRelicSets();
  const { data: mainAffixes } = useGetMainAffixes();

  const currentRelicData = useMemo(
    () => Object.values(allRelics ?? {}).find((d) => d.id === relic.relic_id),
    [allRelics, relic.relic_id],
  );

  const currentMainAffixData = useMemo(() => {
    if (!mainAffixes || !currentRelicData?.main_affix_id) return;

    return mainAffixes?.[currentRelicData?.main_affix_id];
  }, [mainAffixes, currentRelicData?.main_affix_id]);

  const mainAffixProperty = useMemo(() => {
    if (!currentMainAffixData || !relic.main_affix_id) return;

    return Object.values(currentMainAffixData ?? {}).find(
      (item) => item.AffixID === relic.main_affix_id,
    )?.Property;
  }, [currentMainAffixData, relic.main_affix_id]);

  return (
    <div className="wrapper card grid grid-cols-2 gap-8">
      <div className="flex justify-between col-span-2 -mb-6 border-b-2 border-primary pb-2">
        <p className="text-2xl font-bold">
          {relic.id ? "Edit" : "Create"} Relic
        </p>
        <Button
          variant={"secondary"}
          className="justify-self-end font-semibold"
          onClick={() => {
            const missingSubStat = relic.sub_affixes.some(
              (r) => !r.sub_affix_id,
            );
            if (
              !relic.type ||
              !relic.relic_set_id ||
              !relic.main_affix_id ||
              missingSubStat
            )
              return toast.warning("Please complete all relic fields.");

            const transformedSubAffixes = relic.sub_affixes.map((sub) => {
              const totalStep = (sub.steps ?? []).reduce(
                (acc, curr) => acc + curr,
                0,
              );

              return {
                sub_affix_id: sub.sub_affix_id,
                count: sub.count,
                step: totalStep,
              };
            });

            const createRelic = {
              ...relic,
              sub_affixes: transformedSubAffixes,
            } as RelicConfigStore;

            if (relic.id) {
              editRelic(relic.id, createRelic);
              toast.success("Relic has been updated.");
            } else {
              addRelic(createRelic);
              toast.success("Relic has been added.");
            }

            updateRelic(DEFAULT_CREATE_RELIC);
            router.push("/relic");
          }}
        >
          Save
        </Button>
      </div>

      <div className="space-y-4">
        <p className="text-xl font-semibold">Relic Set</p>
        <div className="flex gap-4">
          {/* TYPE */}
          <TypeCreateRelic />

          <div className="flex-1 space-y-2">
            {/* SET */}
            <SetCreateRelic />

            {/* MAIN STAT */}
            <MainAffixCreateRelic
              currentMainAffixData={currentMainAffixData}
              currentRelicData={currentRelicData}
            />
          </div>
        </div>

        {/* SET BONUS */}
        <div>
          {!!relic.relic_set_id &&
            allRelicSets?.[relic.relic_set_id].set_bonus.map(
              ([count, bonus]) => {
                const params = bonus.properties.map((p) => p.value);

                const htmlContent = parsedDesc(bonus.desc, params);

                return (
                  <div key={count}>
                    <h4 className="font-bold">{count}-Piece:</h4>
                    <p
                      className="text-sm text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                  </div>
                );
              },
            )}
        </div>
      </div>

      {/* SUB STAT */}
      <SubAffixCreateRelic mainAffixProperty={mainAffixProperty} />
    </div>
  );
};

export default CreateRelicPage;
